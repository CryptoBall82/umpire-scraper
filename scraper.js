// Import the axios library
const axios = require('axios');
// Import the cheerio library
const cheerio = require('cheerio');
// Import the 'fs' (File System) module to write files
const fs = require('fs');
// Import the 'path' module to help with file paths
const path = require('path');

// --- URL for Alpharetta Park (Blue Sombrero) ---
const alpharettaUrl = 'https://leagues.bluesombrero.com/Default.aspx?tabid=1508807&mid=1621009&templateid=0&ctl=viewallfieldstatus';

// --- URL for Ocee Park ---
const oceeParkUrl = 'https://www.oceepark.com/home';

// Helper function to determine status from Blue Sombrero class string
function determineBlueSombreroStatus(classString) {
    const cleanedClasses = classString.replace(/\s+/g, ' ').trim();
    if (cleanedClasses.includes('fs-open') || cleanedClasses.includes('fs-dt-open')) {
        return 'Open';
    } else if (cleanedClasses.includes('fs-close') || cleanedClasses.includes('fs-dt-close')) {
        return 'Closed';
    }
    return 'Unknown';
}

// Helper function to determine status from Ocee Park status text
function determineOceeStatus(statusText) {
    const lowerText = statusText.toLowerCase();
    if (lowerText.includes('open')) {
        return 'Open';
    } else if (lowerText.includes('closed') || lowerText.includes('close')) {
        return 'Closed';
    }
    return 'Unknown';
}

// --- FUNCTION: Scrape Alpharetta Park (Blue Sombrero) Data ---
async function scrapeAlpharettaData() {
    console.log(`Workspaceing Alpharetta data from: ${alpharettaUrl}`);
    const response = await axios.get(alpharettaUrl);
    const html = response.data;
    console.log('Successfully fetched Alpharetta HTML!');
    const $ = cheerio.load(html);

    const parks = []; // To store data for parks found on this site
    const parkBlocksSelector = 'div.fs-right > div.fs-item';

    $(parkBlocksSelector).each((index, parkElement) => {
        const parkName = $(parkElement).find('h3.fs-name').text().trim();
        const parkAddress = $(parkElement).find('p.fs-address').text().trim();
        const parkStatusClass = $(parkElement).attr('class');
        const overallParkStatus = determineBlueSombreroStatus(parkStatusClass);

        const parkData = {
            name: parkName,
            address: parkAddress,
            source: "Alpharetta Youth Baseball (Blue Sombrero)", // Added source
            overallStatus: overallParkStatus,
            fields: []
        };

        const individualFieldSelector = 'div.fs-detail > div[class*="fs-dt-"]';
        $(parkElement).find(individualFieldSelector).each((fieldIndex, fieldElement) => {
            const fieldName = $(fieldElement).find('h4.fs-dt-head').text().trim();
            const fieldStatusClass = $(fieldElement).attr('class');
            const individualFieldStatus = determineBlueSombreroStatus(fieldStatusClass);
            const fieldUpdateTime = $(fieldElement).find('p.fs-dt-time').text().trim();
            const fieldMessage = $(fieldElement).find('p.fs-dt-message').text().trim();

            const fieldData = {
                name: fieldName,
                status: individualFieldStatus,
                updateTime: fieldUpdateTime
            };
            if (fieldMessage) {
                fieldData.message = fieldMessage;
            }
            parkData.fields.push(fieldData);
        });
        parks.push(parkData);
    });
    console.log(`Found ${parks.length} park(s) from Alpharetta source.`);
    return parks;
}

// --- FUNCTION: Scrape Ocee Park Data ---
async function scrapeOceeParkData() {
    console.log(`Workspaceing Ocee Park data from: ${oceeParkUrl}`);
    const response = await axios.get(oceeParkUrl);
    const html = response.data;
    console.log('Successfully fetched Ocee Park HTML!');
    const $ = cheerio.load(html);

    // Look for the Field Status section in the sidebar
    const statusSpan = $('span.sidebarTitlesN:contains("Field Status")');
    
    if (statusSpan.length === 0) {
        console.log('Field Status section not found on Ocee Park page.');
        return [];
    }

    // Get the status message from the list-group-item span
    const statusMessageElement = statusSpan.closest('div.rightSideBarNav').find('span.list-group-item');
    const statusMessage = statusMessageElement.text().trim();

    if (!statusMessage) {
        console.log('No status message found in Field Status section.');
        return [];
    }

    console.log(`Ocee Park status message: "${statusMessage}"`);

    // Parse the status message to determine overall status
    const overallStatus = determineOceeStatus(statusMessage);

    // Create a single field entry for Ocee Park with the overall status
    const oceeParkData = {
        name: "Ocee Park",
        address: "10900 Buice Rd, Johns Creek, GA 30022",
        source: "OceePark.com",
        overallStatus: overallStatus,
        fields: [
            {
                name: "Ocee Park - All Fields",
                status: overallStatus,
                updateTime: new Date().toLocaleString()
            }
        ]
    };

    console.log(`Found Ocee Park with status: ${overallStatus}`);
    return [oceeParkData];
}


// --- Main Function to Fetch All Data and Save ---
async function fetchAllDataAndSave() {
    try {
        console.log("Starting data scrape for all sources...");
        const alpharettaParks = await scrapeAlpharettaData();
        const oceeParkDataArray = await scrapeOceeParkData(); 

        const allParksData = [...alpharettaParks, ...oceeParkDataArray]; 

        if (allParksData.length === 0) {
            console.log("No data scraped from any source.");
            // fs.writeFileSync(path.join(__dirname, 'field_statuses.json'), JSON.stringify([], null, 2)); // Optionally write empty array
            return;
        }

        const jsonData = JSON.stringify(allParksData, null, 2);
        const outputPath = path.join(__dirname, 'field_statuses.json');
        fs.writeFileSync(outputPath, jsonData);
        console.log(`\nData successfully scraped from all sources and saved to: ${outputPath}`);

    } catch (error) {
        console.error('Error during main fetching or saving process:', error.message);
        // Enhanced error logging for debugging
        if (error.response) { 
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Headers:', error.response.headers);
            // console.error('Error Response Data:', error.response.data); // Be careful with logging large HTML responses
        } else if (error.request) {
            console.error('Error Request Data:', error.request);
        } else {
            console.error('Error Details:', error); // General error
        }
    }
}

// Call the main function
fetchAllDataAndSave();
