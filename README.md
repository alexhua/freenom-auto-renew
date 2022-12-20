
<h4 align="center">通过Cloudflare Workers自动续期Freenom域名(.cf .ga .gq .ml .tk)。</h4>

<p align="center">
  <a href="README_EN.md">English README</a>
</p>
<p align="center">
 Forked from <a href="https://github.com/PencilNavigator/freenom-workers">PencilNavigator/freenom-workers</a>
</p>

## 部署

打开你的 [Cloudflare管理面板](https://dash.cloudflare.com)

在账号主页左侧侧边栏选择Workers

在Workers页面，选择创建服务，设置好服务名称，选择HTTP处理程序。

在刚刚创建的Workers界面，选择“快速编辑”。

在编辑界面，粘贴worker.js内代码，点击保存。

返回刚刚创建的Workers页面，选择“设置”，再选择“变量”。

在变量页面，添加以下变量和变量值：

- ENV_SECRET_USERNAME变量，填入Freenom用户名

- ENV_SECRET_PASSWORD变量，填入Freenom密码

- ENV_ACCESS_USERNAME变量，设置Worker访问用户名

- ENV_ACCESS_PASSWORD变量，设置Worker访问密码

>（可选）勾选两个变量的“加密”选项（可极大程度降低Freenom用户名和密码泄露的概率）。

创建KV Namespace 用于保存登录信息：

1. 侧边栏选择`KV`，打开KV页面，创建一个新namespace，名字任意

2. 打开之前的Wokrer设置变量页面，选择 KV Namespace 绑定

3. 绑定第一步创建的namespace，并设置变量名为 `freenom`

返回创建的Workers页面，选择“触发器”。

在触发器界面，选择添加Cron触发器。在“添加Cron触发器”界面，设置触发器，保存。推荐执行时间为一天一次。

## 测试

（直接访问域名）访问刚刚部署的Workers服务的域名（一般URL为：服务名.设置子域.workers.dev)。顺利的话，你将看到你账户内所有域名的剩余日期。（workers.dev域名在中国内地污染严重，建议绑定一个自己的域名进行访问）。

（触发Cron）进入“快速编辑”，选择“设定时间”，再选择“触发计划的事件”。查看下方Console是否有输出域名剩余日期。

## 效果展示

![图片](https://user-images.githubusercontent.com/85282140/207813815-99af2574-910d-40d1-908c-5f18de1a5648.png)

（2022/12/15测试）

## 待实现的功能

执行成功后，通过邮件送信/TelegramBot/DiscordBot发送执行结果。

## 类似项目

https://github.com/luolongfei/freenom (PHP)

https://github.com/Oreomeow/freenom-py (Python)

## LICENSE

目前没有决定好用什么LICENSE.

![mona-loading](https://github.githubassets.com/images/mona-loading-dark.gif)
