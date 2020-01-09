// external packages
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

// personal packages
const hf = require('../helper-functions/export-functions');

const webApp = express();

// Webapp settings
webApp.use(bodyParser.urlencoded({
    extended: true
}));
webApp.use(bodyParser.json()); 

const PORT = process.env.PORT;

// Home route
webApp.get('/', (req, res) => {
    res.send(`Hello World.!`);
});

// Timezone setting
const TIMEZONE = process.env.TIMEZONE;

// Options to formate the date
const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', timeZone: TIMEZONE };

// Webhook
webApp.post('/webhook', async (req, res) => {

    let responseText = {}, outputString;

    let action = req['body']['queryResult']['action'];

    if (action === 'provides-description') {
        // Show time here
        let availableSlots = await hf.gc.getTimeSlots();

        // Set the dates in Session
        let session = req['body']['session'];
        let sessionVars = `${session}/contexts/session-vars`;

        let slotOne = availableSlots['oneOption'].toLocaleString('en-US', options);
        let slotTwo = availableSlots['twoOption'].toLocaleString('en-US', options);

        outputString = `Please choose on option for the visit. Option 1 - ${slotOne}, Option 2 - ${slotTwo}`;
        responseText = {
            'fulfillmentText': outputString,
            'outputContexts': [{
                'name': sessionVars,
                'lifespanCount': 50,
                'parameters': {
                    'one': availableSlots['oneOption'],
                    'two': availableSlots['twoOption']
                }
            }]
        };
    } else if (action === 'option-one') {
        // Show the summary
        let outputContexts = req['body']['queryResult']['outputContexts'];
        let name, description, date;

        outputContexts.forEach(outputContext => {
            let session = outputContext['name'];
            if (session.includes('/contexts/session-vars')) {
                name = outputContext['parameters']['person']['name'];
                description = outputContext['parameters']['description'];
                date = outputContext['parameters']['one'];
            }
        });

        let nd = new Date(Date.parse(date));

        outputString = `Hey, ${name}, you problem is ${description}, I will come to visit you on ${nd.toLocaleString('en-US', options)}. Please confirm. Yes/No.`;
        responseText['fulfillmentText'] = outputString;
    } else if (action === 'option-two') {
        // Show the summary
        let outputContexts = req['body']['queryResult']['outputContexts'];
        let name, description, date;

        outputContexts.forEach(outputContext => {
            let session = outputContext['name'];
            if (session.includes('/contexts/session-vars')) {
                name = outputContext['parameters']['person']['name'];
                mobile = outputContext['parameters']['mobile'];
                description = outputContext['parameters']['description'];
                date = outputContext['parameters']['two'];
            }
        });

        let nd = new Date(Date.parse(date));

        outputString = `Hey, ${name}, you problem is ${description}, I will come to visit you on ${nd.toLocaleString('en-US', options)}. Please confirm. Yes/No.`;
        responseText['fulfillmentText'] = outputString;
    } else if (action === 'confirm-yes') {
        // Insert the data to Airtable and create new event in Google calendar
        let outputContexts = req['body']['queryResult']['outputContexts'];
        let name, mobile, description, choice, oneOption, twoOption;

        outputContexts.forEach(outputContext => {
            let session = outputContext['name'];
            if (session.includes('/contexts/session-vars')) {
                name = outputContext['parameters']['person']['name'];
                mobile = outputContext['parameters']['mobile'];
                description = outputContext['parameters']['description'];
                choice = outputContext['parameters']['dtOption'];
                oneOption = outputContext['parameters']['one'];
                twoOption = outputContext['parameters']['two'];
            }
        });

        // Insert event to Google calendar
        let startDate, endDate;

        if (choice == 1) {
            startDate = new Date(Date.parse(oneOption));
        } else {
            startDate = new Date(Date.parse(twoOption));
        }

        endDate = new Date(new Date(startDate).setHours(startDate.getHours() + 2));

        let event = {
            'summary': `Appointment for ${name} with Mobile number ${mobile}.`,
            'description': `${description}`,
            'start': {
                'dateTime': startDate,
                'timeZone': TIMEZONE
            },
            'end': {
                'dateTime': endDate,
                'timeZone': TIMEZONE
            }
        };

        // Insert event to Airtable
        let createdDate = new Date();

        let fields = {
            'Name': name,
            'Mobile': parseInt(mobile),
            'Description': description,
            'DateTime': startDate,
            'CreatedDate': createdDate.toLocaleString('en-US', options),
        };

        let adFlag = await hf.ad.insertAppointment(fields);
        let gcFlag = await hf.gc.insertEvent(event);

        if (adFlag == 1 && gcFlag == 1) {
            outputString = 'Thank you, I will visit you soon.';
            responseText['fulfillmentText'] = outputString;
        } else {
            outputString = 'There was an error, please try again after sometime.';
            responseText['fulfillmentText'] = outputString;   
        }
    } else {
        outputString = 'Something is wrong.';
        responseText['fulfillmentText'] = outputString;
    }
    
    res.send(responseText);
});

webApp.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
});