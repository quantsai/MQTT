/*
    消息列表
    const MESSAGE = {
        device_id:{
            message_code:message_body
        }
    }
*/
const MESSAGE = {};
/*
    消息订阅列表
    const SUBSCRIBER = {
        device_id:{
            message_code:[
                {
                    page,
                    callback
                }
            ]
        }
    }
*/
const SUBSCRIBER = {};
/* 消息到达后，存入MESSAGE*/
function onMqttMessageArrived({ topic, payloadString }) {
    // 格式化消息
    let device_id = topic.split('/')[1];
    let { f: message_code, p: message_body } = JSON.parse(payloadString);
    console.log('---------------------------------------- message Arrived:', device_id, message_code, message_body);
    // 存放消息
    if (!(device_id in MESSAGE))
        MESSAGE[device_id] = {};
    MESSAGE[device_id][message_code] = message_body;
    // 发布订阅
    if ((device_id in SUBSCRIBER) && (message_code in SUBSCRIBER[device_id])) {
        let subscribers = SUBSCRIBER[device_id][message_code];
        subscribers.forEach(subscriber => {
            subscriber.callback({ f: message_code, p: message_body }, MESSAGE);
        });
    }
    /*
    // 可以考虑将发布订阅放到模块外，通过defineProperty/proxy来监听数据变化
    Object.defineProperty(MESSAGE[device_id], message_code, {
        get: function () {

        },
        set: function (value) {
            if (!(device_id in SUBSCRIBER)) {
                return;
            }
            if (!(message_code in SUBSCRIBER[device_id])) {
                return;
            }
            let subscribers = SUBSCRIBER[device_id][message_code]
            subscribers.forEach(subscriber => {
                subscriber.callback({f: message_code, p: value}, MESSAGE);
            })


        }
    })
    */
}
// 重连次数
let reconnect_count = 0;
// MQTT处理
class MQTT {
    constructor() {
        this.url = '';
        this.username = '';
        this.password = '';
        this.useSSL = true;
        this.keepAliveInterval = 10;
    }
    setConnectOptions({ url, username, password, useSSL, keepAliveInterval }) {
        if (url)
            this.url = url;
        if (username)
            this.username = username;
        if (password)
            this.password = password;
        if (useSSL)
            this.useSSL = useSSL;
        if (keepAliveInterval)
            this.keepAliveInterval = keepAliveInterval;
    }
    connect() {
        // 模拟发送消息
        setInterval(() => {
            let message = {
                topic: 'topic/device_id_1',
                payloadString: JSON.stringify({ f: Math.floor(Math.random() * 10), p: Math.floor(Math.random() * 100) })
            };
            onMqttMessageArrived(message);
        }, 1.5 * 1000);
        /*
        this.mqtt = new Paho.Client(this.url, this.password)
        this.mqtt.onConnectionLost = this.reconnect();
        this.mqtt.onMessageArrived = onMqttMessageArrived;

        return new Promise(resolve => {
            this.mqtt.connect({
                userName:this.username,
                password:this.password,
                useSSL:this.useSSL,
                keepAliveInterval:this.keepAliveInterval,
                onSuccess(){
                    reconnect_count = 0;
                    resolve(true);
                },
                onFailure(){
                    this.reconnect();
                }
            })
        })
        */
    }
    reconnect() {
        reconnect_count++;
        setTimeout(() => {
            this.connect();
        }, reconnect_count * .5);
    }
    disconnect() {
        return true;
    }
    send() {
    }
    subscribe(device_id, message_code, page, callback) {
        if (!(device_id in SUBSCRIBER))
            SUBSCRIBER[device_id] = {};
        if (!(message_code in SUBSCRIBER[device_id]))
            SUBSCRIBER[device_id][message_code] = [];
        let is_existed = SUBSCRIBER[device_id][message_code].some(item => item.page === page);
        if (is_existed)
            SUBSCRIBER[device_id][message_code] = SUBSCRIBER[device_id][message_code].map(item => item.page === page ? Object.assign({}, item, { callback }) : item);
        else
            SUBSCRIBER[device_id][message_code].push({ page, callback });
        return SUBSCRIBER;
    }
    unsubscribe(device_id, message_code, page) {
        if ((device_id in SUBSCRIBER) && (message_code in SUBSCRIBER[device_id])) {
            SUBSCRIBER[device_id][message_code] = SUBSCRIBER[device_id][message_code].filter(item => item.page !== page);
            if (SUBSCRIBER[device_id][message_code].length === 0) {
                delete SUBSCRIBER[device_id][message_code];
            }
        }
        return SUBSCRIBER;
    }
}
// 建立mqtt连接
let mqtt = new MQTT();
mqtt.setConnectOptions({ url: '', username: '', password: '' });
mqtt.connect();
// 在不同页面/组件内，订阅mqtt消息
mqtt.subscribe('device_id_1', 1, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message);
});
mqtt.subscribe('device_id_1', 1, 'page_2', message => {
    console.log('callback', 'device_id_1-page_2', message);
});
mqtt.subscribe('device_id_1', 2, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message);
});
mqtt.subscribe('device_id_1', 3, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message);
});
// 取消订阅某条消息（退出页面，取消不需要的订阅）
mqtt.unsubscribe('device_id_1', 2, 'page_1');
//# sourceMappingURL=greeter.js.map