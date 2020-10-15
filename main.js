var socks = require('socksv5');
var fs = require('fs')
var path = require('path')
var Ws = require('ws');
var port = 1080, server, mpsapi, config;
const configPath = path.join(__dirname, "private/config.json");

//Make sure the config exists and read the config file
try {
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath)); //Config
    } else {
        console.log('Config file does not exists in the path. Make sure the correct path is set...');
        process.exit();
    }
}
catch (ex) {
    console.log(ex.message);
    process.exit();
}


//config type can be only activedge or meshcentral... extend this for supporting other MPS
if (config.type === 'activedge') {
    mpsapi = new require('./activedgempsapi.js').ActivEdgeMpsApi(config.url, config.mpsapikey);
}
else if (config.type === 'meshcentral') {
    mpsapi = new require('./meshcentralmpsapi.js').MeshCentralMpsApi(config.url, config.user, config.pass);
}
else {
    console.log("Only server types allowed are 'activedge' and 'meshcentral'...");
    process.exit();
}

//Get the nodes that are connected to MPS and set session cookie

mpsapi.Init(function () {
    //Create Socks server
    server = socks.createServer(function (info, accept, deny) {
        if (info.dstPort < 16992 || info.dstPort > 16995) {
            deny();// deny non AMT port
        }
        else {
            var socket = accept(true);
            var ws = null;
            var buff = "";
            socket.on('data', function (chunk) {
                // buffer up if ws is not ready yet
                //console.log(chunk);
                if (ws != null && ws.readyState == 1) {
                    ws.send(chunk);
                } else {
                    buff += chunk;
                }
            });

            var node = mpsapi.GetNodebyIpaddr(info['dstAddr']);
            if (node) {
                var ws = new Ws(mpsapi.GetWebSocketUrl(node, info), [], mpsapi.GetWebSocketOptions());
                // wiring up
                ws.on('close', function () {
                    //console.log("WS close.");
                    try { socket.end() }
                    catch (e) { console.log(e) }
                });

                ws.on('error', function () {
                    //console.log("WS error.");
                    try { socket.end() }
                    catch (e) { console.log(e) }
                });

                ws.on('open', function () {
                    if (buff.length > 0) {
                        //console.log("Sending pending buffer: "+ buff);
                        ws.send(buff); buff = "";
                    }
                    socket.on('close', function () {
                        try { ws.close() }
                        catch (e) { console.log(e) }
                    });
                    socket.on('error', function () {
                        try { ws.close() }
                        catch (e) { console.log(e) }
                    });
                });
                ws.on('message', function (data) {
                    //console.log("From WSS: "+ data);
                    socket.write(data)
                });

            }
            else {
                console.log('Node not connected to MPS. Try reconnecting device to MPS again...');
                socket.write('Node not connected to MPS. Try reconnecting device to MPS again...')
                socket.end();
            }
        }
    })

    //Listening!!!
    server.listen(port, 'localhost', function () {
        console.log('SOCKS server listening on port 1080');
    });

    //TODO: Add Authentication logic here
    server.useAuth(socks.auth.None());
});





