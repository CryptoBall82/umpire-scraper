// Import the axios library
const axios = require('axios');
// Import the cheerio library
const cheerio = require('cheerio');
// Import the 'fs' (File System) module to write files
const fs = require('fs');
// Import the 'path' module to help with file paths
const path = require('path');

// The URL of the field status page you want to scrape
const url = 'https://leagues.bluesombrero.com/Default.aspx?tabid=1508807&mid=1621009&templateid=0&ctl=viewallfieldstatus';

// NEW: Helper function to determine status from class string
function determineStatus(classString) {
    const cleanedClasses = classString.replace(/\s+/g, ' ').trim(); // Clean up whitespace
    if (cleanedClasses.includes('fs-open') || cleanedClasses.includes('fs-dt-open')) {
        return 'Open';
    } else if (cleanedClasses.includes('fs-close') || cleanedClasses.includes('fs-dt-close')) {
        return 'Closed';
    }
    return 'Unknown'; // Default if neither is found
}

async function fetchDataAndParse() {
    try {
        console.log(`Workspaceing HTML from: ${url}`);
        const response = await axios.get(url);
        const html = response.data;
        console.log('Successfully fetched the HTML!');

        console.log('Loading HTML into Cheerio...');
        const $ = cheerio.load(html);

        const parkBlocksSelector = 'div.fs-right > div.fs-item';
        
        const allParksData = [];

        $(parkBlocksSelector).each((index, parkElement) => {
            const parkName = $(parkElement).find('h3.fs-name').text().trim();
            const parkAddress = $(parkElement).find('p.fs-address').text().trim();
            const parkStatusClass = $(parkElement).attr('class'); // Get the raw class string

            // MODIFIED: Use the helper function for overall park status
            const overallParkStatus = determineStatus(parkStatusClass);

            const parkData = {
                name: parkName,
                address: parkAddress,
                overallStatus: overallParkStatus, // Store human-readable status
              // overallStatusClasses: parkStatusClass.replace(/\s+/g, ' ').trim(), // Optionally keep raw classes if needed
                fields: [] 
            };

            const individualFieldSelector = 'div.fs-detail > div[class*="fs-dt-"]';

            $(parkElement).find(individualFieldSelector).each((fieldIndex, fieldElement) => {
                const fieldName = $(fieldElement).find('h4.fs-dt-head').text().trim();
                const fieldStatusClass = $(fieldElement).attr('class'); // Get the raw class string
                const fieldUpdateTime = $(fieldElement).find('p.fs-dt-time').text().trim();
                const fieldMessage = $(fieldElement).find('p.fs-dt-message').text().trim();

                // MODIFIED: Use the helper function for individual field status
                const individualFieldStatus = determineStatus(fieldStatusClass);

                const fieldData = {
                    name: fieldName,
                    status: individualFieldStatus, // Store human-readable status
                  // statusClasses: fieldStatusClass.replace(/\s+/g, ' ').trim(), // Optionally keep raw classes
                    updateTime: fieldUpdateTime
                };
                if (fieldMessage) {
                    fieldData.message = fieldMessage;
                }
                parkData.fields.push(fieldData);
            });
            allParksData.push(parkData);
        });

        const jsonData = JSON.stringify(allParksData, null, 2);
        const outputPath = path.join(__dirname, 'field_statuses.json');
        fs.writeFileSync(outputPath, jsonData);
        console.log(`\nData successfully scraped and saved to: ${outputPath}`);

    } catch (error) {
        console.error('Error during fetching, parsing, or saving:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received for the request.');
        } else {
            console.error('Error details:', error);
        }
    }
}

fetchDataAndParse();
