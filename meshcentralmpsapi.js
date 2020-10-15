var Ws = require('ws');
var Url = require('url');
var querystring = require("querystring");
var https = require('https');

module.exports.MeshCentralMpsApi = function (url, user, pass) {
    var obj = {};
    obj.url = url;
    obj.user = user;
    obj.pass = pass;
    obj.connectedNodes = {};
    obj.cookie = null

    obj.Init = function (cb) {
        obj.GetNodesAndCookie(cb);
    }

    // Get list of connected AMT nodes
    obj.GetNodesAndCookie = function (cb, ret_cookie) {
        // authenticate to Meshcentral
        var cred = { username: obj.user, password: obj.pass };
        var url = Url.parse(obj.url);

        // prepare request options
        var auth_postdata = querystring.stringify(cred);
        var options = {
            rejectUnauthorized: false,
            hostname: url.hostname,
            method: "POST",
            port: (url.port == null) ? "443" : url.port,
            path: "/login",
            timeout: 10000,
            followRedirect: true,
            maxRedirects: 10,
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
                'Content-length': Buffer.byteLength(auth_postdata)
            }
        }

        var req = https.request(options, function (res) {
            if (res.statusCode == 302) {
                var ws_headers = {
                    'Cookie': res.headers['set-cookie']
                };
                var ws_options = { rejectUnauthorized: false };
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
                        Object.values(nodes).forEach(m => {
                            m.forEach(el => {
                                if (el.intelamt != null && el.conn != null && el.conn > 0) {
                                    fnodes[el.ip] = {
                                        id: el._id,
                                        name: el.name,
                                        ip: el.ip,
                                        uuid: el.intelamt.uuid
                                    };
                                }
                            });
                        });
                        obj.connectedNodes = fnodes;
                        obj.cookie = ws_headers["Cookie"];
                        console.log(JSON.stringify(fnodes, null, 3));
                        //console.log(obj.cookie)
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
            res.on("error", function () {
                // invoke callback without parameters
                if (cb) cb();
            })
        });
        req.write(auth_postdata);
        req.end();
    }

    obj.GetWebSocketUrl = function (node, info) {
        var p = 1, tls = 0, serverauth = 0;
        var url = Url.parse(obj.url);
        url.port = (url.port == null) ? "443" : url.port;
        var wss_url = 'wss://' + url.hostname + ':' + url.port + '/webrelay.ashx?';
        if (info.dstPort == 16994 || info.dstPort == 16995) { p = 2; serverauth = 1 } // REDIR port
        if (info.dstPort == 16993 || info.dstPort == 16995) { tls = 1 }
        if (tls == 0) {
            wss_url += 'p=' + p + '&host=' + node.id + '&port=' + info.dstPort + '&tls=0&tls1only=0';
        } else {
            wss_url += 'p=' + p + '&host=' + node.id + '&port=' + info.dstPort + '&tls=1&tls1only=1';
        }
        if (serverauth != 0) { wss_url += '&serverauth=1' };
        return wss_url;
    }

    obj.GetWebSocketOptions = function () {
        var options = {
            rejectUnauthorized: false,
            headers: {
                'Cookie': obj.cookie
            }
        };
        return options;
    }

    obj.GetNodebyIpaddr = function (ipddr) {
        if (obj.connectedNodes[ipddr]) {
            return obj.connectedNodes[ipddr];
        }
        return null;
    }

    return obj;
}