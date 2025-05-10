// Import the axios library
const axios = require('axios');
// Import the cheerio library
const cheerio = require('cheerio');
// NEW: Import the 'fs' (File System) module to write files
const fs = require('fs');
// NEW: Import the 'path' module to help with file paths
const path = require('path');

// The URL of the field status page you want to scrape
const url = 'https://leagues.bluesombrero.com/Default.aspx?tabid=1508807&mid=1621009&templateid=0&ctl=viewallfieldstatus';

async function fetchDataAndParse() {
    try {
        console.log(`Workspaceing HTML from: ${url}`);
        const response = await axios.get(url);
        const html = response.data;
        console.log('Successfully fetched the HTML!');

        console.log('Loading HTML into Cheerio...');
        const $ = cheerio.load(html);

        const parkBlocksSelector = 'div.fs-right > div.fs-item';

        // NEW: Array to hold all our structured park data
        const allParksData = [];

        $(parkBlocksSelector).each((index, parkElement) => {
            const parkName = $(parkElement).find('h3.fs-name').text().trim();
            const parkAddress = $(parkElement).find('p.fs-address').text().trim();
            const parkStatusClass = $(parkElement).attr('class').replace(/\s+/g, ' ').trim();

            // NEW: Object to hold data for the current park
            const parkData = {
                name: parkName,
                address: parkAddress,
                overallStatusClasses: parkStatusClass,
                fields: [] // Array to store field data for this park
            };

            const individualFieldSelector = 'div.fs-detail > div[class*="fs-dt-"]';

            $(parkElement).find(individualFieldSelector).each((fieldIndex, fieldElement) => {
                const fieldName = $(fieldElement).find('h4.fs-dt-head').text().trim();
                const fieldStatusClass = $(fieldElement).attr('class').replace(/\s+/g, ' ').trim();
                const fieldUpdateTime = $(fieldElement).find('p.fs-dt-time').text().trim();
                const fieldMessage = $(fieldElement).find('p.fs-dt-message').text().trim();

                // NEW: Object to hold data for the current field
                const fieldData = {
                    name: fieldName,
                    statusClasses: fieldStatusClass,
                    updateTime: fieldUpdateTime
                };
                if (fieldMessage) {
                    fieldData.message = fieldMessage;
                }

                // NEW: Add the current field's data to the park's fields array
                parkData.fields.push(fieldData);
            });

            // NEW: Add the current park's data (with all its fields) to the main array
            allParksData.push(parkData);
        });

        // NEW: Convert the allParksData array to a JSON string
        // The 'null, 2' part makes the JSON output nicely formatted (indented by 2 spaces)
        const jsonData = JSON.stringify(allParksData, null, 2);

        // NEW: Define the path where the JSON file will be saved
        // path.join ensures the path is correct for your operating system
        // __dirname is a Node.js global variable that gives the directory of the current script
        const outputPath = path.join(__dirname, 'field_statuses.json');

        // NEW: Write the JSON data to the file
        fs.writeFileSync(outputPath, jsonData);
        console.log(`\nData successfully scraped and saved to: ${outputPath}`);


    } catch (error) {
        console.error('Error during fetching, parsing, or saving:', error.message); // MODIFIED error message
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received for the request.');
        } else {
            // For errors not related to HTTP response (e.g., file system errors)
            console.error('Error details:', error);
        }
    }
}

fetchDataAndParse();