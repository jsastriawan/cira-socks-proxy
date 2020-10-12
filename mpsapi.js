var Ws = require('ws');
var Url = require('url');
var querystring = require("querystring");
var https = require('https');

module.exports.MPSApi = function (url, user, pass) {
    var obj = {};
    obj.url = url;
    obj.user = user;
    obj.pass = pass;
    // Get list of connected AMT nodes
    obj.GetConnectedNodesAndCookie = function(cb, ret_cookie) {
        // authenticate to Meshcentral
        var cred = { username: obj.user, password: obj.pass };
        var url = Url.parse(obj.url);
        // prepare request options
        var auth_postdata = querystring.stringify(cred);
        var options = {rejectUnauthorized:false}
        options.hostname = url.hostname;
        options.method = "POST";
        options.port = (url.port == null) ? "443" : url.port;
        options.path = "/login";
        options.timeout = 10000;
        options.followRedirect = true;
        options.maxRedirects = 10;
        options.headers = {
            'Content-type': 'application/x-www-form-urlencoded',
            'Content-length': Buffer.byteLength(auth_postdata)
        }
        var req = https.request(options, function (res) {
            if (res.statusCode == 302) {
                var ws_headers = {
                    'Cookie': res.headers['set-cookie']
                };
                var ws_options = { rejectUnauthorized: false};
                ws_options.headers = ws_headers;                                
                var ws = new Ws('wss://' + options.hostname + ":" + options.port + "/control.ashx", [], ws_options);
                ws.on('open', function () {
                    //console.log("WS open");
                    var jstr = { "action": "nodes" };
                    ws.send(JSON.stringify(jstr));
                });

                ws.on('close', function (code, reason) {
                    //console.log('WS close:' + code + ":" + reason);
                });

                ws.on('error', function (er) {
                    //console.log('WS error:' + er);
                    if (cb) cb();
                });

                ws.on('message', function (data) {
                    var msg = null;
                    try {
                        msg = JSON.parse(data);
                    } catch (e) {
                        msg = data;
                    }
                    //console.log('WS message: ' + new Date().toString() + '\n' + JSON.stringify(msg,null,"   "));
                    if (msg.action == "nodes") {
                        nodes = JSON.parse(JSON.stringify(msg.nodes));
                        // build nodes flat list
                        fnodes = {};
                        Object.values(nodes).forEach(m =>{
                            m.forEach(el => {
                                if (el.intelamt !=null && el.conn!=null && el.conn > 0) {
                                    fnodes[el.ip] = {
                                        id: el._id,
                                        name : el.name,
                                        ip: el.ip,
                                        uuid: el.intelamt.uuid
                                    };
                                }
                            });
                        });
                        //console.log(JSON.stringify(fnodes,null,3));
                        if (cb) cb(fnodes, ws_headers["Cookie"]);
                        ws.close();
                    } else if (msg.action == 'close' && msg.cause == 'noauth') {
                        if (cb) cb();
                        ws.close();
                    }
                });

            }
            res.on("data", function (chunk) {
                //console.log(chunk.toString());
            });
            res.on("error", function() {
                // invoke callback without parameters
                if (cb) cb();
            })
        });
        req.write(auth_postdata);
        req.end();    }
    return obj;
}