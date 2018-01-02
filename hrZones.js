const tcx = require('tcx-js');
const babar = require('babar');
const winston = require('winston');
const fs = require('fs');
var program = require('commander');

/**
 * Numeric sort helper for array
 * @param {Int} a 
 * @param {Int} b 
 */
function sortNumber(a, b) {
    return a - b;
}

function list(val) {
    console.log('Split: ', val);
    return val.split(',');
}

///////////////////////////////////////////////////////////////////////////////
///                             Main Processing                             ///
///////////////////////////////////////////////////////////////////////////////
var conf = {
    logLevel: 'info',
    hrZones: [],
    filename: '',
};

// Parse Arguments
program
    .version('0.0.1')
    .usage('[options] <file>')
    .option('-d, --debug', 'Show debug information')
    .option('-z, --heartRateZones [values]', 'Your Heart Rate Zones.', list, [95, 130, 145, 155, 165, 190])
    .parse(process.argv);

// logger
if (program.debug) conf.logLevel = 'debug';

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            level: conf.logLevel,
            colorize: true
        })
    ]
});

console.log('\033c'); // Clear Screen
logger.info('hrZones.js - version 0.0.1');

if (program.debug) logger.debug('CLI Args - Debugging: true');
logger.debug('CLI Args - Heart Rate Zones: %j', program.heartRateZones);
logger.debug('CLI Args - Argzments: %j', program.args);

if (program.args.length == 0) {
    logger.error('File name missing. See \'node hrZones.js --help\' for further information.');
    process.exit();
}

// Check if HR Zones are correct
var hrError = false;
program.heartRateZones.forEach(element => {
    if (element == parseInt(element, 10))
        conf.hrZones.push(parseInt(element));
    else {
        logger.error('A heart rate zone value is not correct. %j is not an integer. See \'node hrZones.js --help\' for further information.', element);
        hrError = true;
    }
});

if (hrError) process.exit();

// Check if filename exists
conf.filename = program.args[0];
try {
    fs.accessSync(conf.filename);
} catch (e) {
    logger.error('File not found: ' + conf.filename);
    process.exit();
}

// Open file and read heartrate
logger.info('Processing: ' + conf.filename);
parser = new tcx.Parser();
parser.parse_file(conf.filename);
trackpoints = parser.activity.trackpoints;

var hr = [];
trackpoints.forEach(element => {
    if (element.hr_bpm) {
        hr.push(parseInt(element.hr_bpm));
    };
});

if (hr.length == 0) {
    logger.error('No heart rates found in file. Please make sure, that the tcx file is correct.');
    process.exit();
}

hr.sort(sortNumber);

// Process hr array
var zonePointer = 0;
var zoneCounter = 0;
var zoneDistribution = [];

conf.hrZones.push(999); // Ad as additional max Limit
hr.forEach(element => {
    if (element >= conf.hrZones[zonePointer]) {
        zoneDistribution.push(zoneCounter);
        zonePointer++;
        zoneCounter = 0;
    }
    zoneCounter++;
});
zoneDistribution.push(zoneCounter); // Push last badge

var checkSum = 0;
zoneDistribution.forEach(element => {
    checkSum = checkSum + element;
});

logger.debug('# of HR entries: ' + hr.length);
logger.debug('# of HR entries processed: ' + checkSum);
logger.debug(zoneDistribution);

// Make absolute values % values
zoneDistributionPercentage = [];
zonePointer = 0;

zoneDistribution.forEach(element => {
    zoneDistributionPercentage.push([zonePointer, element / checkSum * 100]);
    zonePointer++;
});

logger.debug(zoneDistributionPercentage);

// Output
console.log('\n');
logger.info('Heart Rate Distribution\n' + babar(zoneDistributionPercentage) + '\n\n');
logger.info('Hear Rate Zones:');

for (let i = 0; i < conf.hrZones.length; i++) {
    const element = conf.hrZones[i];

    if (i == 0) {
        interval = '0 - ' + (parseInt(element) - 1);
    } else if (i + 1 == conf.hrZones.length) {
        interval = '>=' + conf.hrZones[i - 1];
    } else {
        interval = conf.hrZones[i - 1] + ' - ' + (parseInt(element) - 1) + '\tGA' + i;
    }

    logger.info(i + ': ' + interval);
}