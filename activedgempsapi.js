var Url = require('url');
var https = require('https');

module.exports.ActivEdgeMpsApi = function (url, apikey) {
    var obj = {};
    obj.url = url;
    obj.apikey = apikey;
    obj.connectedNodes = {}

    obj.Init = function (cb) {
        obj.GetNodesAndCookie(cb);
    }

    // Get list of connected AMT nodes
    obj.GetNodesAndCookie = function (cb, ret_cookie) {
        var url = Url.parse(obj.url);
        let postData = {
            'method': 'ConnectedDevices',
            'payload': {}
        }
        const options = {
            hostname: url.hostname,
            port: (url.port == null) ? "443" : url.port,
            path: '/admin',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-MPS-API-KEY': obj.apikey
            },
            rejectUnauthorized: false
        }
        var req = https.request(options, function (res) {
            if (res.statusCode === 200) {
                var nodes = '';
                res.on('data', (chunk) => {
                    nodes += chunk;
                })
                res.on('end', () => {
                    console.log(JSON.parse(nodes));
                    obj.connectedNodes = JSON.parse(nodes);
                    if (cb) cb(obj.connectedNodes);
                })
                req.on('error', (e) => {
                    console.log(`problem with request: ${e.message}`)
                })
            }
            else {
                if (cb) cb(null);
            }
        });
        req.write(JSON.stringify(postData));
        req.end();
    }

    obj.GetWebSocketUrl = function (node, info) {
        var p = 1, tls = 0, serverauth = 0;
        var url = Url.parse(obj.url);
        url.port = (url.port == null) ? "443" : url.port;
        var wss_url = 'wss://' + url.hostname + ':' + url.port + '/relay/webrelay.ashx?';
        if (info.dstPort == 16994 || info.dstPort == 16995) { p = 2; serverauth = 1 } // REDIR port
        if (info.dstPort == 16993 || info.dstPort == 16995) { tls = 1 }
        if (tls == 0) {
            wss_url += 'p=' + p + '&host=' + node.host + '&port=' + info.dstPort + '&tls=0&tls1only=0';
        } else {
            wss_url += 'p=' + p + '&host=' + node.host + '&port=' + info.dstPort + '&tls=1&tls1only=1';
        }
        if (serverauth != 0) { wss_url += '&serverauth=1' };
        return wss_url;
    }

    obj.GetWebSocketOptions = function () {
        var options = {
            rejectUnauthorized: false,
            headers: {
                'X-MPS-API-Key': obj.apikey
            }
        };
        return options;
    }

    obj.GetNodebyIpaddr = function (ipddr) {
        for (var i = 0; i < obj.connectedNodes.length; i++) {
            if (ipddr === obj.connectedNodes[i]['name']) {
                return obj.connectedNodes[i];
            }
        }
        return null;
    }

    return obj;
}