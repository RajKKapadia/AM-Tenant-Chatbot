// Google Settings
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = 'https://www.googleapis.com/auth/calendar';

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);

const calendarId = process.env.CALENDAR_ID;
const calendar = google.calendar({ version: "v3" });

const auth = new google.auth.JWT(
    CREDENTIALS.client_email,
    null,
    CREDENTIALS.private_key,
    SCOPES
);

const TIMEOFFSET = process.env.TIMEOFFSET;
const TIMEZONE = process.env.TIMEZONE;

// Generate appointment options
const getTimeSlots = async () => {

    let date = new Date();

    let day = date.getDate();
    if (day < 10) {
        day = 0 + day.toString();
    }

    let month = date.getMonth() + 1;
    if (month < 10) {
        month = 0 + month.toString();
    }

    let year = date.getFullYear();

    let hour = date.getHours();
    if (hour < 10) {
        hour = 0 + hour.toString();
    }

    let minute = date.getMinutes();
    if (minute < 10) {
        minute = 0 + minute.toString();
    }

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;

    let startDate, endDate;

    if (parseInt(hour) > 16) {
        let tempDate = new Date(Date.parse(newDateTime));
        startDate = new Date(new Date(tempDate).setHours(tempDate.getHours() + 12));
        endDate = new Date(new Date(startDate).setHours(startDate.getHours() + 168));
    } else {
        startDate = new Date(Date.parse(newDateTime));
        endDate = new Date(new Date(startDate).setHours(startDate.getHours() + 168));
    }

    // Get list of events
    let response = await calendar.events.list({
        auth: auth,
        calendarId: calendarId,
        timeMin: startDate,
        timeMax: endDate,
        timeZone: TIMEZONE
    });

    // All events
    let events = response['data']['items'];

    if (events.length == 0) {

        let td = new Date(Date.parse(`${year}-${month}-${day}T09:00:00.000${TIMEOFFSET}`));

        let oneOption = new Date(new Date(td).setHours(td.getHours() + 24));
        let twoOption = new Date(new Date(td).setHours(td.getHours() + 52));

        return {
            oneOption,
            twoOption
        };

    } else {

        let filledSlots = [];

        events.forEach(event => {
            filledSlots.push(new Date(Date.parse(event['start']['dateTime'])));
        });

        let td = new Date(Date.parse(`${year}-${month}-${day}T09:00:00.000${TIMEOFFSET}`));

        let t = 24, count = 0, freeSlots = [], i = 0;

        while (filledSlots.length < 2) {

            if (freeSlots.length == 2) {
                break;
            }

            // New temporary date
            let nd = new Date(new Date(td).setHours(td.getHours() + t));

            // Possible dates for appointments
            let one = new Date(new Date(td).setHours(td.getHours() + t));
            let two = new Date(new Date(td).setHours(td.getHours() + t + 1));
            let three = new Date(new Date(td).setHours(td.getHours() + t + 4));
            let four = new Date(new Date(td).setHours(td.getHours() + t + 5));

            let thisCount = 0;

            for (let j = 0; j < filledSlots.length; j++) {
                let fs = filledSlots[j];
                if (nd.getDate() === fs.getDate()) {
                    thisCount += 1;
                }
            }

            count += thisCount;

            if (thisCount > 1) {

            } else if (thisCount == 0) {
                let rn = Math.random();
                if (rn < 0.25) {
                    freeSlots.push(one);
                } else if (rn > 0.25 && rn < 0.5) {
                    freeSlots.push(two);
                } else if (rn > 0.5 & rn < 0.75) {
                    freeSlots.push(three);
                } else {
                    freeSlots.push(four);
                }
            } else {
                if (one.getTime() === filledSlots[count - 1].getTime() || two.getTime() === filledSlots[count - 1].getTime()) {
                    if (Math.random() > 0.5) {
                        freeSlots.push(three);
                    } else {
                        freeSlots.push(four);
                    }
                } else if (three.getTime() === filledSlots[count - 1].getTime() || four.getTime() === filledSlots[count - 1].getTime()) {
                    if (Math.random() > 0.5) {
                        freeSlots.push(one);
                    } else {
                        freeSlots.push(two);
                    }
                }
            }
            t += 24;
        }

        let oneOption = freeSlots[0];
        let twoOption = freeSlots[1];

        return {
            oneOption,
            twoOption
        };
    }
};

// Insert new event to Google Calendar
const insertEvent = async (event) => {

    let response = await calendar.events.insert({
        auth: auth,
        calendarId: calendarId,
        resource: event
    });

    if (response['status'] == 200 && response['statusText'] === 'OK') {
        return 1;
    } else {
        return 0;
    }
};

module.exports = {
    getTimeSlots,
    insertEvent
};