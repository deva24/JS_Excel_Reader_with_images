var os = require("os");
var hostname = os.hostname();
var ntlm2 = require('ntlm');
var net = require('net');
var headerParser = require('http-headers')

var connCount = 0;

var server = net.createServer(socket =>
{
    var connId = ++connCount;

    var tunnelEstablished = false;
    var tunnelSocket;
    socket.on('data', async data =>
    {
        if (!tunnelEstablished)
        {
            var headerData = headerParser(data);
            if (headerData.method == undefined)
            {
                console.log('No method ' + connId);
                socket.destroy();
                return;
            }
            console.log('C -> P    S: ' + connId);
            console.log(data.toString());
            console.log('----');

            socket.on('close', () =>
            {
                console.log('----')
                console.log('Client connection closed ' + connId);
                console.log('----')
                tunnelSocket.destroy();
            });


            tunnelSocket = await getAuthenticatedSocket(data.toString(), connId, socket);
            tunnelEstablished = true;

            tunnelSocket.on('data', data =>
            {
                console.log('C <==P=== S: ' + connId);
                socket.write(data);
            });

            tunnelSocket.on('close', () =>
            {
                console.log('----')
                console.log('WNS proxy closed ' + connId);
                console.log('----')
                socket.destroy();
            });
     
            if (headerData.method == 'CONNECT')
            {
                if (headerData.headers.connection == 'close')
                {
                    var e_msg =
                        `HTTP/1.1 200 OK
Server: DevaAPS/2.1
Connection: close
Proxy-Connection: keep-alive

`.replace(/\n/g, '\r\n');

                    socket.write(e_msg);
                }
                else
                {
                    var e_msg =
                        `HTTP/1.1 200 OK
Server: DevaAPS/2.1
Content-Type: application/octet-stream

`.replace(/\n/g, '\r\n')

                    socket.write(e_msg);
                }
                console.log('C <- P    S: ' + connId);
                console.log(e_msg);
                console.log('----');
            }


        }
        else
        {
            console.log('C ===P==> S: ' + connId);
            tunnelSocket.write(data);
        }
    })
});

server.listen(1338);

function getAuthenticatedSocket(initialRequest, connId, underSocket)
{
    return new Promise((resolve, reject) =>
    {
        var client = new net.Socket();
        client.connect(8080, '10.36.193.47', function ()
        {
            var state = 'status';
            var bodyLen = 0;
            var bodyIndex = 0;

            var kacc = '';
            var acc = '';

            var httpHeader = null;
            var httpBody = null;

            var prevChar = '';

            var onData = data =>
            {
                console.log('C    P <- S: ' + connId);
                console.log('----');
                console.log(data.toString());
                console.log('----');

                for (var i = 0; i < data.length; i++)
                {
                    if (state == 'header' || state == 'status')
                    {
                        var c = String.fromCharCode(data[i]);
                        acc += c;
                        kacc += c;

                        if (c == '\n' && prevChar == '\n')
                        {
                            httpHeader = headerListener(acc);
                            acc = '';

                            if (httpHeader.headers && httpHeader.headers['content-length'] != undefined && httpHeader.headers['content-length'] != '0')
                            {
                                state = 'body';
                                bodyLen = parseInt(httpHeader.headers['content-length']);
                                httpBody = new Uint8Array(bodyLen);
                                prevChar = '';
                                continue;
                            }
                            else
                            {

                                resposneListener(httpHeader, null);
                            }
                        }
                        if (c != '\r')
                            prevChar = c;
                    }
                    if (state == 'body')
                    {
                        httpBody[bodyIndex] = data[i];
                        bodyIndex++;

                        if (bodyIndex >= bodyLen)
                        {
                            resposneListener(httpHeader, httpBody);
                        }
                    }
                }


            }

            client.on('data', onData);

            function headerListener(data)
            {
                var obj = headerParser(data.toString());
                return obj;
            }

            function resposneListener(header, body)
            {
                var lacc = kacc;
                kacc = '';
                acc = '';
                state = 'status';
                prevChar = '';
                httpHeader = null;
                httpBody = null;
                bodyLen = 0;
                bodyIndex = 0;
                if (typeof onResposne == 'function')
                {
                    onResposne({ header, body, kacc: lacc });
                }
            }

            var onResposne = null;

            function sendM1()
            {
                new Promise((res, rej) => res()).then(() =>
                {
                    var type1 = ntlm2.challengeHeader(hostname, 'sharedservices');

                    var ir1 = initialRequest;
                    ir1 = ir1.replace(/\r/g, '');
                    ir1 = ir1.split('\n');
                    if(ir1[ir1.length-1]=='')
                        ir1.pop();
                    if(ir1[ir1.length-1]=='')
                        ir1.pop();
                    ir1.push(`Proxy-Authorization: ${type1}`);
                    var closeConIndex = ir1.indexOf('Connection: close');
                    if (closeConIndex >= 0)
                    {
                        ir1.splice(closeConIndex, 1);
                    }
                    if (initialRequest.indexOf('User-Agent') == -1)
                    {
                        ir1.push('User-Agent: DevaAPS/2.1');
                    }
                    ir1.push('');
                    ir1.push('');
                    ir1 = ir1.join('\r\n');

                    //console.log(data);
                    console.log('C    P -> S: ' + connId);
                    console.log('----');
                    console.log(ir1);
                    console.log('----');
                    client.write(ir1);
                });
            }

            function sendM3(type2)
            {
                new Promise(res => res()).then(() =>
                {

                    var res = {
                        headers: {
                            'www-authenticate': type2
                        }
                    };

                    var irh = headerParser(initialRequest);
                    var type3 = ntlm2.responseHeader(res, irh.url, 'sharedservices', 'dmh92807', 'Sep$123456');

                    var ir3 = initialRequest;
                    ir3 = ir3.replace(/\r/g, '');
                    ir3 = ir3.split('\n');
                    if(ir3[ir3.length-1]=='')
                        ir3.pop();
                    if(ir3[ir3.length-1]=='')
                        ir3.pop();

                    ir3.push(`Proxy-Authorization: ${type3}`);
                    var closeConIndex = ir3.indexOf('Connection: close');
                    if (closeConIndex >= 0)
                    {
                        ir3.splice(closeConIndex, 1);
                    }
                    if (initialRequest.indexOf('User-Agent') == -1)
                    {
                        ir3.push('User-Agent: DevaAPS/2.1');
                    }
                    ir3.push('');
                    ir3.push('');
                    ir3 = ir3.join('\r\n');

                    //ir3 = ir3.replace('Connection: close','Connection: keep-alive');
                    console.log('C    P -> S: ' + connId);
                    console.log(ir3);
                    console.log('----');
                    client.write(ir3);
                });
            }

            sendM1();
            onResposne = function (response)
            {
                if (response.header.statusCode == 200)
                {
                    client.off('data', onData);
                    console.log('M3 not required');
                    console.log('handing over socket');
                    resolve(client);
                    var irh = headerParser(initialRequest);
                    if (irh.method == 'GET')
                    {
                        var data = response.kacc;
                        if (response.body)
                        {
                            data += response.data;
                        }
                        underSocket.write(data);
                        console.log('C <==P=== S ' + connId);
                        console.log(data);
                        console.log('----');
                    }
                }
                else
                {
                    var pa = response.header.headers['proxy-authenticate'];
                    sendM3(pa);
                    console.log('M3 sent');

                    onResposne = function (response)
                    {
                        client.off('data', onData);

                        var irh = headerParser(initialRequest);
                        console.log('handing over socket');
                        
                        if (irh.method == 'GET')
                        {
                            var data = response.kacc;
                            underSocket.write(data);
                            if (response.body!==undefined && response.body!==null)
                            {
                                underSocket.write(response.body);
                            }
                            for(var i=0; i<response.body.length; i++)
                            {
                                data+=String.fromCharCode(response.body[i]);
                            }                            
                            
                            console.log('C <==P=== S ' + connId);
                            console.log(data);
                            console.log('----');
                        }
                        resolve(client);
                    }
                }
            }

        });
    });
}
process.on('uncaughtException', function (err)
{
    // globalRes.write(JSON.stringify({ error: err.message }));
    // globalRes.end();
    console.log('Caught exception: ' + err);
});
// var HttpsProxyAgent = require('https-proxy-agent');
// var request = require('request');
// var proxy = 'http://127.0.0.1:1337';
// var agent = new HttpsProxyAgent(proxy);

// request({
// 	uri: "https://www.google.com:443",
// 	method: "GET",
// 	/*headers: {
// 		'content-type': 'application/x-www-form-urlencoded'
//     },*/
//     rejectUnauthorized: false,
// 	agent: agent,
// 	timeout: 10000,
// 	followRedirect: true,
// 	maxRedirects: 10,
// 	//body: "name=john"
// }, function(error, response, body) {
// 	console.log("Error" + error);
// 	console.log("Response: " + response);
// 	console.log("Body: " + body);
// });