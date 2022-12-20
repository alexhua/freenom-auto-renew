const GITHUB_URL = "https://github.com/alexhua/freenom-auto-renew"

const DEBUG = false
const AUTH_ENABLE = true // whether enable page access authorization
const AUTH_REALM = "Freenom Renew Worker" // for page authorization

const FREENOM = 'https://my.freenom.com'
const CLIENT_AREA = `${FREENOM}/clientarea.php`
const LOGIN_URL = `${FREENOM}/dologin.php`
const LOGOUT_URL = `${FREENOM}/logout.php`
const DOMAIN_STATUS_URL = `${FREENOM}/domains.php?a=renewals`
const RENEW_REFERER_URL = `${FREENOM}/domains.php?a=renewdomain`
const RENEW_DOMAIN_URL = `${FREENOM}/domains.php?submitrenewals=true`
const COOKIE_TTL = 3600 * 24  //Login cookies validity period
const TIME_ZONE = 'Asia/Shanghai'  //For scheduler run time display


// default headers
const CONTENT_TYPE_URLENCODED = "application/x-www-form-urlencoded"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/103.0.5060.134 Safari/537.36"
const RequestHeaders = new Headers()

/* begin authentication */
function checkRequestAuth(request) {
   const AUTH = {}
   AUTH[ENV_ACCESS_USERNAME] = ENV_ACCESS_PASSWORD
   const header = new Map(request.headers)
   if (!header.has("authorization")) {
      return false
   }
   const auth = header.get("authorization").split(' ')
   if (auth.length != 2 || auth[0] != "Basic") {
      return false
   }
   return checkAuth(auth[1], AUTH);
}

function checkAuth(str, userpass) {
   const decoded = atob(str).split(":")
   if (decoded.length != 2) {
      return false
   } else {
      const user = decoded[0]
      const pass = decoded[1]
      return userpass[user] && userpass[user] == pass
   }
}
/* end authentication */

async function login(ip = "1.1.1.1") {
   RequestHeaders.set("User-Agent", USER_AGENT)
   RequestHeaders.set("X-Forwarded-For", ip)
   /* Get existed login cookies from KV */
   let cookies = JSON.parse(await freenom.get("cookies")) ?? []
   if (cookies.length == 2 && ip == await freenom.get("clientIP")) {
      DEBUG && console.log("Get cookies from KV : ", cookies.join("; "), `ip:${ip}`)
   } else {
      /* Get login cookies from server */
      cookies = []
      RequestHeaders.set("Referer", CLIENT_AREA)
      RequestHeaders.set("Content-Type", CONTENT_TYPE_URLENCODED)
      const resp = await fetch(LOGIN_URL, {
         method: 'POST',
         body: `username=${ENV_SECRET_USERNAME}&password=${ENV_SECRET_PASSWORD}&rememberme=on`,
         headers: RequestHeaders,
         redirect: 'manual',
      })
      DEBUG && console.log("Login RespCode=" + resp.status)
      const setCookie = resp.headers
         .get('Set-Cookie')
         .replace(/([Hh]ttp[Oo]nly(,|)|([Pp]ath|expires|Max-Age)=.*?;)/g, '')
         .replace('WHMCSUser=deleted;', '')
         .replace(/\s+/g, '')
         .split(';')
         .reduce((cookie, cur) => {
            const [k, v] = cur.split('=')
            if (k && v) cookie[k] = v
            return cookie
         }, {})
      // setCookie["CONSENT"] = "YES+"
      for (const key in setCookie) {
         cookies.push(`${key}=${setCookie[key]}`)
      }
      await freenom.put("cookies", JSON.stringify(cookies), { expirationTtl: COOKIE_TTL })
      await freenom.put("clientIP", ip, { expirationTtl: COOKIE_TTL })
      DEBUG && console.log("Get cookies from Server : ", cookies.join("; "), `ip:${ip}`)
   }

   RequestHeaders.set("Cookie", cookies.join("; "))
   return cookies
}

async function logout() {
   const cookies = await freenom.get("cookies")
   if (cookies) RequestHeaders.set("Cookie", cookies.join('; '))
   await fetch(LOGOUT_URL, { headers: RequestHeaders })
   await freenom.delete("cookies")
   await freenom.delete("clientIP")
}

async function getDomainInfo() {
   const res = { token: null, domains: {} }
   // request
   RequestHeaders.set("Referer", CLIENT_AREA)
   RequestHeaders.delete("Content-Type")
   const resp = await fetch(DOMAIN_STATUS_URL, { headers: RequestHeaders })
   const html = await resp.text()
   DEBUG && console.log("GetDomain RespCode=" + resp.status)
   // login check
   if (/<a href="logout.php">Logout<\/a>/i.test(html) == false) {
      console.error('Get login status failed')
      await freenom.delete("cookies")
      await freenom.delete("clientIP")
      return res
   }
   // get page token
   const tokenMatch = /name="token" value="(.*?)"/i.exec(html)
   if (tokenMatch.index == -1) {
      console.error('Get page token failed')
      return res
   }
   res.token = tokenMatch[1]
   // get domains
   for (const item of html.match(/<tr>[^&]+&domain=.*?<\/tr>/g)) {
      const domain = /<tr><td>(.*?)<\/td><td>[^<]+<\/td><td>/i.exec(item)[1]
      const days = /<span[^>]+>(\d+).Days<\/span>/i.exec(item)[1]
      const renewalId = /[^&]+&domain=(\d+?)"/i.exec(item)[1]
      res.domains[domain] = { days, renewalId }
   }
   return res
}

async function renewDomains(domainInfo) {
   const token = domainInfo.token
   for (const domain in domainInfo.domains) {
      const days = domainInfo.domains[domain].days
      if (parseInt(days) < 15) {
         const renewalId = domainInfo.domains[domain].renewalId
         RequestHeaders.set("Referer", `${RENEW_REFERER_URL}&domain=${renewalId}`)
         RequestHeaders.set("Content-Type", CONTENT_TYPE_URLENCODED)
         const resp = await fetch(RENEW_DOMAIN_URL, {
            method: 'POST',
            body: `token=${token}&renewalid=${renewalId}&renewalperiod[${renewalId}]=12M&paymentmethod=credit`,
            headers: RequestHeaders,
         })
         const html = await resp.text()
         console.log(
            domain,
            /Order Confirmation/i.test(html) ? '续期成功' : '续期失败'
         )
      } else {
         console.log(`${domain} 还有 ${days} 天续期`)
      }
   }
}

async function handleSchedule(scheduledDate) {
   console.log('scheduled date', scheduledDate)
   const workerIP = await (await fetch("http://ident.me")).text()
   await login(workerIP)
   const domainInfo = await getDomainInfo()
   DEBUG && console.log('token', domainInfo.token)
   DEBUG && console.log('domains', domainInfo.domains)
   await renewDomains(domainInfo)
   let now = new Date()
   await freenom.put("lastScheduledTime", now.toLocaleString("zh-CN", { timeZone: TIME_ZONE }))
}

async function handleRequest(request) {
   if (AUTH_ENABLE && !checkRequestAuth(request)) {
      return new Response("", { status: 401, headers: { "WWW-Authenticate": `Basic realm="${AUTH_REALM}"` } })
   }
   if (request.url.endsWith("favicon.ico")) {
      return new Response("", { status: 404 })
   }
   // const workerIP = await (await fetch("http://ident.me")).text()
   const clientIP = request.headers.get("cf-connecting-ip")
   await login(clientIP)
   const domainInfo = await getDomainInfo()
   //await logout()
   const domains = domainInfo.domains
   const domainHtml = []
   let color = "green"
   for (const domain in domains) {
      const days = domains[domain].days
      if (days < 15) color = orange
      if (days < 8) color = red
      domainHtml.push(`<p><span class="domain">${domain}</span> 还有 <span style="font-weight: bold;color:${color};">${days}</span> 天更新</p>`)
   }
   if (domainHtml.length === 0)
      domainHtml.push('<p class="warning">查询域名信息失败</p>')
   const lastScheduledTime = await freenom.get("lastScheduledTime") ?? 'N/A'
   const html = `
   <!DOCTYPE html>
   <html>
   <head>
      <title>Freenom Renewer</title>
      <style type="text/css">
        .content {
            height: 96vh;
            display:flex;
            flex-direction: column;            
            justify-content: center;
        }
        .domain {
            color: blue;
            width: 48vw;            
            text-align: end;            
            font-weight: bold;
            display: inline-block;
        }
        .warning {
            font-weight:bold;
            color:DarkOrange;
            text-align:center;
        }
        .footer {
            position: fixed;
            bottom: .2rem;
            width: 98vw;
            display: flex;
            justify-content: space-between;
        }
      </style>
   </head>
   <body>
      <div class="content">
         ${domainHtml.join('\n')}
         <p class="warning"><br>续订任务上次运行时间：${lastScheduledTime}</p>
      </div>
      <footer class="footer">
         <em>项目仓库：<a href="${GITHUB_URL}" target="_blank">${GITHUB_URL}</a></em>
         <em>ClientIP: ${clientIP}</em>
      </footer>
   </body>
   </html>
   `
   return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
   })
}

addEventListener('fetch', (event) => {
   event.respondWith(handleRequest(event.request))
})

addEventListener('scheduled', (event) => {
   event.waitUntil(handleSchedule(event.scheduledTime))
})
