# Build tool for user script

### Install:
* `npm install`

### Using:

* Put script code in `./src/appname/main.js`
* Run dev-watch server for debug `gulp --app appname --autoreload`
    * Paste dev-script into your [user script manager](https://chrome.google.com/webstore/search/user%20script) from clipboard
* Run `gulp build` and get your script in `./build/appname/main.js`
