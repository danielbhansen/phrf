/*******************
 * 1. Registering Service Worker
 * 2. Declaring globals
 * 3. Check for LS and load anything therein
 * 4. Load fleet/boat data from json
 * 5. populate fleet dropdown
 * 6. populate boat dropdown
 * 7. calculate TOT and diffs
 * 8. other functions 
 ********************/


/* the service worker stuff */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("sw.js")
            .then(res => console.log("service worker registered"))
            .catch(err => console.log("service worker not registered", err))
    })
}

/* the app stuff */
let form = document.querySelector('.form');
let output = document.querySelector('.output');
let dpmoutput = document.querySelector('.dpm');
let fleetSelect = document.querySelector('#fleet');
let chooseBoat = document.querySelector('.choose-boat');
let boatSelect = document.querySelector('#boat-choice');
let ehInput = document.querySelector('#elapsedHours');
let emInput = document.querySelector('#elapsedMins');
let esInput = document.querySelector('#elapsedSecs');
let fleetOptions = [];
let boats = [];
let compArray = [];
let fleetArray = [];
let times = [];
let fcdelta = [];
let deltabs = [];
let elapsedArray = [];
let data, corr, rat, fleetOption, chosenBoat, chosenFleet, subTime, elapsedHours, elapsedMins, elapsedSecs, seconds, raceType, chosenBoatID;
let coeff = 550;

/* Check localStorage availability */
function storageAvailable(type) {
    let storage;
    try {
        storage = window[type];
        const x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return (
            e instanceof DOMException &&
            // everything except Firefox
            (e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === "QuotaExceededError" ||
                // Firefox
                e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage &&
            storage.length !== 0
        );
    }
}

/* if available, check for and load the stuff we've defined */
if (storageAvailable("localStorage")) {
    let raceTypeH = localStorage.getItem("race");
    let chosenFleetH = localStorage.getItem("fleet");
    let chosenBoatH = localStorage.getItem("boat");
    let chosenBoatIDH = localStorage.getItem("boatID");
    let secondsH = localStorage.getItem("time");
    let subtimeH = localStorage.getItem("submitted");
    if (raceTypeH) {
        raceType = raceTypeH;
    }
    if (chosenFleetH) {
        chosenFleet = chosenFleetH;
    }
    if (chosenBoatH) {
        chosenBoat = chosenBoatH;
    }
    if (chosenBoatIDH) {
        chosenBoatID = +chosenBoatIDH;
    }
    if (secondsH) {
        seconds = +secondsH;
    }
    if (subtimeH) {
        subTime = subtimeH;
    }
}

/* Load the Inshore Data */
async function getInshore() {
    try {
        const response = await fetch('inshore.json?version=002');
        if (response.ok) {
            data = await response.json();
            putFleetOptions();
            addToStorage("race", "inshore");
        } else {
            console.log('no bueno - data no fetchie');
        }
    }
    catch (error) {
        console.log(error);
    }
}

/* Load the Offshore Data */
async function getOffshore() {
    try {
        const response = await fetch('offshore.json?version=002');
        if (response.ok) {
            data = await response.json();
            putFleetOptions();
        } else {
            console.log('no bueno - json did not get fetched');
        }
    }
    catch (error) {
        console.log(error);
    }
}


/* Build the first option list */
function putFleetOptions() {
    /* get key strings of dataset */
    fleetOptions = Object.keys(data);
    /* build the option list */
    fleetOptions.forEach(f => {
        fleet.insertAdjacentHTML('beforeend', `
            <option value="${f}">${f} Fleet</option>
        `
        );
    });
    // if a fleet is already in localStorage, 'choose' that fleet otherwise, listen for a selection
    if (chosenFleet) {
        setFleet(chosenFleet);
    }
    fleetSelect.addEventListener('change', () => {
        resetBoat();
        setFleet();
    });
}

/* Select Fleet */
function setFleet(x) {
    form.classList.add('hidden');
    output.innerHTML = '';
    dpmoutput.innerHTML = '';
    boatSelect.innerHTML = `<option value="null">Please choose a boat</option>`;
    fleetArray = Object.entries(data);
    
    if (x) {
        fleetSelect.value = x;
    }

    chosenFleet = fleetSelect.value;
    addToStorage("fleet", chosenFleet);

    fleetArray.forEach(f => {
        if (f[0] === chosenFleet) {
            boats = f[1];
        };
    });

    /* fleet is chosen, build boat select */
    boats.forEach(b => {
        boatSelect.insertAdjacentHTML('beforeend', `<option value=${b.name}>${b.name}</option>`)
    });
    chooseBoat.classList.remove('hidden');

    // if boat exists in localStorage
    if (chosenBoat) {
        // select the item matching the id of the boat
        boatSelect.selectedIndex = chosenBoatID;
        calcDPM(chosenBoat);
    }
    // listen for the next choice 
    boatSelect.addEventListener('change', () => {
        resetTime();
        calcDPM();
    });
}

/* Calculate Delta Per Minute */
function calcDPM(x) {
    output.innerHTML = '';
    dpmoutput.innerHTML = `<h3>Seconds per minute deltas:</h3><p><small>The number of seconds per minute of racing you need to be within of each competitor to maintain at least equal standing:</small></p><table class="dpmtable"></table>`;
    fcdelta = [];
    compArray = [];
    chosenBoatID = boatSelect.options[boatSelect.selectedIndex].index;
    chosenBoat = boatSelect.options[boatSelect.selectedIndex].innerText;
    addToStorage("boat", chosenBoat);
    addToStorage("boatID", chosenBoatID);

    /* show DPM stuff */
    boats.forEach(boat => {
        if (boat.name === chosenBoat) {
            rat = boat.rating;
        } else {
            // put the other boats in an array
            compArray.push(boat);
        }
    });
    dpmoutput.innerHTML = `
        <h2>${chosenBoat}</h2>
        <p>Rating: ${rat}</p>
        <h3>Seconds per minute deltas:</h3>
        <p><small>The number of seconds per minute of racing you need to be within of each competitor to maintain at least equal standing:</small></p><table class="dpmtable"><tr><th>Competitor</th><th>Rating</th><th>s/min delta</th></tr></table>
        `;

    /* iterate through competitor array and calculate distance per minute for each */
    let dpmtableoutput = document.querySelector('.dpmtable');
    compArray.forEach(comp => {
        let ratd = comp.rating - rat;
        let spmd = 60 * ratd / (coeff + comp.rating)
        let spmdr = spmd.toFixed(2);
        if (spmdr < 0) {
            spmdr = Math.abs(spmdr);
            dpmtableoutput.insertAdjacentHTML('beforeend', `<tr><td> ${comp.name}</td><td>${comp.rating}</td><td>stay within <strong>${spmdr}</strong> s/min</td></tr>`);
        } else if (spmdr > 0) {
            dpmtableoutput.insertAdjacentHTML('beforeend', `<tr><td>${comp.name}</td><td>${comp.rating}</td><td>stay <strong>${spmdr}</strong> s/min ahead</td></tr>`);
        }
        else {
            dpmtableoutput.insertAdjacentHTML('beforeend', `<tr><td>${comp.name}</td><td>${comp.rating}</td><td>you have equal rating</td></tr>`);
        }
    });

    // Is this being used?
    fcdelta.forEach((b, index) => {
        const diff = b - tx;
        let diffhours = new Date(diff * 1000).toISOString().substring(11, 19);
        output.insertAdjacentHTML('beforeend', `<h4>You need to beat ${deltabs[index]} by ${diffhours}</h4>`);
    });

    /* show the elapsed time form and listen for the submission */
    form.classList.remove('hidden');
    if (seconds) {
        calcAll(coeff, seconds);
    }
    form.addEventListener('submit', submitTime);
}

/* handle the elapsed time form submission */
function submitTime(e) {
    e.preventDefault();
    subTime = '';
    output.innerHTML = '';
    times = [];
    deltabs = [];
    fcdelta = [];
    let eString = [];
    let formdata = new FormData(this);
    elapsedHours = formdata.get('elapsedHours');
    elapsedMins = formdata.get('elapsedMins');
    elapsedSecs = formdata.get('elapsedSecs');

    /* Construct the time array */
    eString.push(elapsedHours);
    eString.push(elapsedMins);
    eString.push(elapsedSecs);

    /* fill in zeros in fron of single digits */
    eString.forEach((num, index) => {
        if (num.length === 1) {
            eString[index] = '0' + num;
        }
    });

    /* human-friendly version of submitted time */
    eString.forEach(n => {
        subTime += n + ':';
    });
    subTime = subTime.slice(0, -1);
    localStorage.setItem("submitted", subTime);
    seconds = (+eString[0]) * 60 * 60 + (+eString[1]) * 60 + (+eString[2]);
    localStorage.setItem("time", seconds)
    
    /* Calculate all the things */
    calcAll(coeff, seconds);
}

/* calculate the deltas */
function calcAll(cf, tx) {
    boats.forEach(boat => {
        calcCorrected(cf, boat.rating, tx); // returns 'corrected'
        const c1 = new Date(corrected * 1000).toISOString().substring(11, 19);
        if (boat.name === chosenBoat) {
            corr = corrected;
            rat = boat.rating;
            output.insertAdjacentHTML('beforeend', `<p>Submitted Time:</p><h2>${subTime}</h2><h3>Your corrected time is: <span class="corrected">${c1}</span></h3>`);
        }
    });
    compArray.forEach(comp => {
        calcCorrectedDelta(cf, comp.rating, corr); // returns tc
        fcdelta.push(tc);
        deltabs.push(comp.name);
    });

    /* compare the selected boat's time with the competitors, calculate and show delta */
    fcdelta.forEach((b, index) => {
        const diff = b - tx;
        if (diff < 0) {
            let pdiff = Math.abs(diff);
            let diffhours = new Date(pdiff * 1000).toISOString().substring(11, 19);
            output.insertAdjacentHTML('beforeend', `<p>You need to be within at least <strong>${diffhours}</strong> of <strong>${deltabs[index]}</strong>.</p>`);
        } else if (diff === 0) {
            output.insertAdjacentHTML('beforeend', `<p>You and <strong>${deltabs[index]}</strong> are even, you just need to cross the line ahead.</p>`);
        } else {
            let diffhours = new Date(diff * 1000).toISOString().substring(11, 19);
            output.insertAdjacentHTML('beforeend', `<p>You need to beat <strong>${deltabs[index]}</strong> by <strong>${diffhours}</strong>.</p>`);
        }
    });
}

/* calculate corrected time */
function calcCorrected(c, r, t) {
    const tcf = c / (coeff + r);
    return corrected = t * tcf;
}

/* calculate rating delta */
function calcCorrectedDelta(x, y, z) {
    const tcfd = x / (coeff + y);
    return tc = z / tcfd;
}

/* add to localStorage */
function addToStorage(k, v) {
    localStorage.setItem(k, v);
}

/* clear chosen boat */
function resetBoat() {
    chosenBoat = '';
    localStorage.removeItem("boat");
    localStorage.removeItem("boatID");
    form.classList.add('hidden');
    resetTime();
}

/* clear times */
function resetTime() {
    seconds = '';
    localStorage.removeItem("time");
    localStorage.removeItem("submitted");
    ehInput.value = null;
    emInput.value = null;
    esInput.value = null;
    subTime = '';
}

function startUp() {
    getInshore();
}
window.onload = startUp();
