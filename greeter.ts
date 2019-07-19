/*
    消息列表
    const MESSAGE = {
        device_id:{
            message_code:message_body
        }
    }
*/
const MESSAGE = {}


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
const SUBSCRIBER = {}

/* 消息到达后，存入MESSAGE*/
function onMqttMessageArrived({topic, payloadString}: { topic: string, payloadString }) {

    // 格式化消息
    let device_id = topic.split('/')[1]
    let {f: message_code, p: message_body} = JSON.parse(payloadString)
    console.log('---------------------------------------- message Arrived:', device_id, message_code, message_body)

    // 存放消息
    if (!(device_id in MESSAGE))
        MESSAGE[device_id] = {}
    MESSAGE[device_id][message_code] = message_body

    // 发布订阅
    if ((device_id in SUBSCRIBER) && (message_code in SUBSCRIBER[device_id])) {
        let subscribers = SUBSCRIBER[device_id][message_code]
        subscribers.forEach(subscriber => {
            subscriber.callback({f: message_code, p: message_body}, MESSAGE);
        })
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

// MQTT类的接口，用来校验public属性与方法
interface MQTT_interface {
    mqtt;
    url: string;
    username: string;
    password: string;
    useSSL: boolean;
    keepAliveInterval: number;

    // 设置连接mqtt所需的参数，所有参数可选
    setConnectOptions({}: { url?: string, username?: string, password?: string, useSSL?: boolean, keepAliveInterval?: number });

    // 建立mqtt连接
    connect();

    // mqtt重连
    reconnect();

    // 断开mqtt连接
    disconnect();

    // 发送mqtt消息
    send();

    /*
    * 添加监听
    * device_id: 需要监听的设备
    * message_code: 需要监听的消息code
    * page: 在哪个页面监听
    * callback: 监听到数据时的回调函数
    * */
    subscribe(device_id: string, message_code: string | number, page: string, callback: () => any);

    // 解除监听，参数参考subscribe
    unsubscribe(device_id: string, message_code: string | number, page: string);
}

// 重连次数
let reconnect_count = 0;

// MQTT处理
class MQTT implements MQTT_interface {
    public mqtt
    public url: string = ''
    public username: string = ''
    public password: string = ''
    public useSSL: boolean = true
    public keepAliveInterval: number = 10;

    constructor() {
    }

    setConnectOptions({url, username, password, useSSL, keepAliveInterval}
                          : { url?: string, username?: string, password?: string, useSSL?: boolean, keepAliveInterval?: number }
    ) {
        if (url)
            this.url = url;
        if (username)
            this.username = username;
        if (password)
            this.password = password;
        if (useSSL)
            this.useSSL = useSSL;
        if (keepAliveInterval)
            this.keepAliveInterval = keepAliveInterval
    }

    connect() {

        // 模拟发送消息
        setInterval(() => {
            let message: { topic: string, payloadString: string } = {
                topic: 'topic/device_id_1',
                payloadString: JSON.stringify({f: Math.floor(Math.random() * 10), p: Math.floor(Math.random() * 100)})
            }
            onMqttMessageArrived(message)
        }, 1.5 * 1000)
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
        }, reconnect_count * .5)
    }

    disconnect(): boolean {
        return true
    }

    send() {
    }

    subscribe(device_id: string, message_code: string | number, page: string, callback: (message) => any) {
        if (!(device_id in SUBSCRIBER))
            SUBSCRIBER[device_id] = {}

        if (!(message_code in SUBSCRIBER[device_id]))
            SUBSCRIBER[device_id][message_code] = []

        let is_existed = SUBSCRIBER[device_id][message_code].some(item => item.page === page)
        if (is_existed)
            SUBSCRIBER[device_id][message_code] = SUBSCRIBER[device_id][message_code].map(item => item.page === page ? {
                ...item,
                callback
            } : item)
        else
            SUBSCRIBER[device_id][message_code].push({page, callback})

        return SUBSCRIBER
    }

    unsubscribe(device_id: string, message_code: string | number, page: string) {

        if ((device_id in SUBSCRIBER) && (message_code in SUBSCRIBER[device_id])) {
            SUBSCRIBER[device_id][message_code] = SUBSCRIBER[device_id][message_code].filter(item => item.page !== page)
            if (SUBSCRIBER[device_id][message_code].length === 0) {
                delete SUBSCRIBER[device_id][message_code]
            }
        }

        return SUBSCRIBER
    }
}


// 建立mqtt连接
let mqtt = new MQTT();
mqtt.setConnectOptions({url: '', username: '', password:''})
mqtt.connect()


// 在不同页面/组件内，订阅mqtt消息
mqtt.subscribe('device_id_1', 1, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message)
})
mqtt.subscribe('device_id_1', 1, 'page_2', message => {
    console.log('callback', 'device_id_1-page_2', message)
})
mqtt.subscribe('device_id_1', 2, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message)
})
mqtt.subscribe('device_id_1', 3, 'page_1', message => {
    console.log('callback', 'device_id_1-page_1', message)
})

// 取消订阅某条消息（退出页面，取消不需要的订阅）
mqtt.unsubscribe('device_id_1', 2, 'page_1')






