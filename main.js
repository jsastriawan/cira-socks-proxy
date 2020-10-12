var socks = require('socksv5');
var fs = require('fs')
var cfg = JSON.parse(fs.readFileSync('./private/config.json'));
var mpsapi = require('./mpsapi.js').MPSApi(cfg.url,cfg.user, cfg.pass);
var Url = require('url');
var Ws = require('ws');
const { createWebSocketStream } = require('ws');
const { Console } = require('console');

var nodes = {};
mpsapi.GetConnectedNodesAndCookie(function (n, c) {
    console.log(JSON.stringify(n, null, 3));
    nodes = n;
    var cookies = c;
    var srv = socks.createServer(function (info, accept, deny) {
        //console.log("Info:"+JSON.stringify(info,null,3));
        if (info.dstPort < 16992 || info.dstPort> 16995) { 
            deny();// deny non AMT port
        } else {
            var socket = accept(true);
            var ws = null;
            var buff="";
            socket.on('data', function(chunk) {
                // buffer up if ws is not ready yet
                //console.log("Socket data: "+ chunk);
                if (ws!=null && ws.readyState == 1) {
                    ws.send(chunk); 
                } else {
                    buff+=chunk;
                } 
            });
            var node = nodes[info['dstAddr']];
            var url = Url.parse(cfg.url);
            var wss_url = 'wss://'+url.hostname+'/webrelay.ashx?';
            var ws_options = { rejectUnauthorized: false, headers: { 'Cookie': cookies }};            
            var p = 1;
            var tls=0;
            var serverauth=0;
            if (info.dstPort == 16994 || info.dstPort == 16995) { p = 2; serverauth=1 } // REDIR port
            if (info.dstPort == 16993 || info.dstPort == 16995) { tls = 1 }
            if (tls==0) {
                wss_url +='p='+p+'&host='+node.id+'&port='+info.dstPort+'&tls=0&tls1only=0';
            } else {
                wss_url +='p='+p+'&host='+node.id+'&port='+info.dstPort+'&tls=1&tls1only=1';
            }
            if (serverauth!=0) {wss_url+='&serverauth=1'};
            var ws = new Ws(wss_url,[], ws_options);
            // wiring up
            ws.on('close', function() {
                //console.log("WS close.");
                try {socket.end()} catch (e){ console.log(e)} 
            });
            ws.on('error', function() {
                //console.log("WS error.");
                try {socket.end()} catch (e){ console.log(e)}
            });
            ws.on('open', function() {
                //console.log("Open websocket: "+ wss_url);                
                // clear up pending data
                //console.log("Buff: "+buff);
                if (buff.length > 0) { 
                    //console.log("Sending pending buffer: "+ buff);
                    ws.send(buff); buff =""; 
                }
                socket.on('close', function (){
                    try { ws.close()} catch (e) {console.log(e)}
                });
                socket.on('error', function (){
                    try { ws.close()} catch (e) {console.log(e)}
                });
            });
            ws.on('message', function(data) {
                //console.log("From WSS: "+ data);
                socket.write(data)
            });            
        }        
    });
    srv.listen(1080, 'localhost', function () {
        console.log('SOCKS server listening on port 1080');
    });
    srv.useAuth(socks.auth.None());
});

