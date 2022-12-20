
<h4 align="center">Renew your Freenom domain (.cf .ga .gq .ml .tk) automaticly with Cloudflare Workers.</h4>

<p align="center">
  <a href="README.md">简体中文README</a>
</p>
<p align="center">
 Forked from <a href="https://github.com/PencilNavigator/freenom-workers">PencilNavigator/freenom-workers</a>
</p>

## Set-up

Open your [Cloudflare Dashboard](https://dash.cloudflare.com)

Select "Workers" in the left sidebar on the homepage.

On the Workers tab，choose "Create a Service"，choose your service name，and select a starter (HTTP Handler)。

On the Workers you just created, select "Quick edit".

In the Quick edit interface, copy and paste the code in worker_EN.js and click Save.

Go back to the Workers page you just created and select "Settings" and then "Variables".

On the variables page, add the following variable name and value.

- ENV_SECRET_USERNAME fill with your Freenom username.
- ENV_SECRET_PASSWORD fill with your Freenom password.
- ENV_ACCESS_USERNAME set the worker access username by yourself
- ENV_ACCESS_PASSWORD set the worker access password by yourself

Create a KV namespace for storing login information:

1. Select `KV` from the sidebar to open the KV page and create a new namespace with any name you want.

2. Go back to the Worker settings variables page and select `KV Namespace` binding.

3. Bind to the namespace created in step 1 and set the variable name to `freenom`.

(Optional) Select the Encryption option for both variables to reduce the probability of leakage for your Freenom username and password.

Return to the created Workers page and select Triggers.

On the Trigger screen, click "Add Cron Trigger". On the Add Cron Trigger page, set up the trigger and save the Settings. The recommended execution time is once a day.

## Test

(Access the domain) Access the domain of your deployed Workers service (normally the URL is "servicename.subdomain.workers.dev"). If successful, you will see the remaining dates of all domains in your account.

(Trigger scheduled event) Enter "Quick Edit", select "Set Time", and then select "Trigger scheduled event". You should see the console outputing the remaining date of the domain.

## Planned enhancement

After execution, send execution result via Email/TelegramBot/DiscordBot.

## Simliar Projects
https://github.com/luolongfei/freenom (PHP)

https://github.com/Oreomeow/freenom-py (Python)

## LICENSE
TBD

![mona-loading](https://github.githubassets.com/images/mona-loading-dark.gif)
