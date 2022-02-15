const express = require('express')
const AWS = require('aws-sdk')
const app = express()

app.use(express.json())

AWS.config.update({ region: 'us-east-1' });

const sns = new AWS.SNS({ apiVersion: '2010-03-31' })

const TOPIC_ARN = 'arn:aws:sns:us-east-1:971410147123:sms-topic'

app.get('/', async (req, res) => {
    const result = await sns.listSubscriptionsByTopic({ TopicArn: TOPIC_ARN }).promise()
    return res.json(result)
})

app.post('/register/:number', async (req, res) => {
    const { number } = req.params

    const params = {
        PhoneNumber: number, 
    };
    
    await sns.createSMSSandboxPhoneNumber(params).promise()

    return res.json({ success: true })
})

app.post('/confirm-register/:number', async (req, res) => {
    const { number } = req.params
    const { Token } = req.body

    console.log({Token})
    await sns.verifySMSSandboxPhoneNumber({
        PhoneNumber: number,
        OneTimePassword: Token
    }).promise()

    return res.json({ success: true })
})

app.post('/subscribe/:number', async (req, res) => {
    const { number } = req.params

    console.log({ number })
    const params = {
        Protocol: 'sms',
        TopicArn: TOPIC_ARN,
        Endpoint: number
    }

    await sns.subscribe(params).promise()

    return res.json({ success: true })
})

app.post('/unsubscribe/:number', async (req, res) => {
    const { number } = req.params
    try {
        const result = await sns.listSubscriptionsByTopic({ TopicArn: TOPIC_ARN }).promise()
        const subscriptionArn = result.Subscriptions.find(sub => String(sub.Endpoint) === number).SubscriptionArn 
    
        if(!subscriptionArn) throw 'Subscription not found'
    
        await sns.unsubscribe({
            SubscriptionArn:subscriptionArn 
        }).promise()
    
        return res.json({ success: true })
    } catch(err) {
        return res.json({ success: false, error: err })
    }
})

app.post('/send', async (req, res) => {
    const Message = req.body.Message

    await sns.publish({
        Message: Message,
        TopicArn: TOPIC_ARN,
    }).promise()

    return res.json({ success: true })
})

app.post('/send/:number', async (req, res) => {
    const Message = req.body.Message
    const PhoneNumber = req.params.number

    console.log({ Message, PhoneNumber })

    await sns.publish({
        Message: Message,
        PhoneNumber: PhoneNumber,
    }).promise()

    return res.json({ success: true })
})

const PORT = 8080

app.listen(PORT, () => {
    console.log(`APP runing in port ${PORT}`)
})