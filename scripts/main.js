const homepage = document.getElementById("homepage");
const example = document.getElementById("example");
const fileInput = document.getElementById("file");
const uploadBox = document.getElementById("upload");
const customization = document.getElementById("customization");
const back = document.getElementById("back");
const comparisonsDiv = document.getElementById("comparisons");
const balancedButton = document.getElementById("balanced");
const equalButton = document.getElementById("equal");
const maxButton = document.getElementById("max");
const minButton = document.getElementById("min");
const sobButton = document.getElementById("sob");
const percentButton = document.getElementById("percent-button");
const percentSlider = document.getElementById("percent-slider");
const real = document.getElementById("real");
const game = document.getElementById("game");
const methodButtons = document.querySelectorAll('input[name="method"]');
const decimalButtons = document.querySelectorAll('input[name="decimal"]');
const timesaveButtons = document.querySelectorAll('input[name="timesave"]');
const comparisonDiv = document.getElementById("comparison-time");
const splitList = document.getElementById("split-list");
const copy = document.getElementById("copy");
const copied = document.getElementById("copied");

let timingMethod = "RealTime";
let decimals = 2;
let comparisonTime = 0;
let timesave = 30000;
let splitsXML = null;
let segments = [];
let comparisons = [];

fileInput.addEventListener("change", e => {
    handleFileDrop(fileInput.files);
});

uploadBox.addEventListener("keydown", e => {
    if (e.code == "Enter") {
        fileInput.click();
    }
})

uploadBox.addEventListener("drop", e => {
    e.preventDefault();
    uploadBox.classList.remove("drag");
    handleFileDrop(e.dataTransfer.files);
});

uploadBox.addEventListener("dragleave", e => {
    e.preventDefault();
    uploadBox.classList.remove("drag");
});

uploadBox.addEventListener("dragenter", e => {
    e.preventDefault();
    uploadBox.classList.add("drag");
});

uploadBox.addEventListener("dragover", e => {
    e.preventDefault();
});

example.addEventListener("click", e => {
    fetch("assets/examples/example.lss")
        .then(res => res.text())
        .then(xml => parseXML(xml));
});

back.addEventListener("click", e => {
    customization.classList.add("hidden");
    homepage.classList.remove("hidden");
    fileInput.value = null;
    game.checked = false;
    real.checked = true;
    timingMethod = "RealTime";
});

equalButton.addEventListener("click", e => {
    const sob = calculateSumOfBest();
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment 
            + Math.floor((comparisonTime - sob) / segments.length);
    });
    updateSplitTimes();
});

balancedButton.addEventListener("click", e => {
    const sob = calculateSumOfBest();
    segments.forEach(segment => {
        if (sob == 0) {
            segment.comparisonSegment = 0;
        } else {
            segment.comparisonSegment = segment.bestSegment 
                + Math.floor((comparisonTime - sob) 
                * (segment.bestSegment / sob));
        }
    });
    updateSplitTimes();
});

maxButton.addEventListener("click", e => {
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment;
    });
    const sob = calculateSumOfBest();
    segments[0].comparisonSegment = segments[0].bestSegment + comparisonTime - sob;
    updateSplitTimes();
});

minButton.addEventListener("click", e => {
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment;
    });
    const sob = calculateSumOfBest();
    const lastSegment = segments[segments.length - 1];
    lastSegment.comparisonSegment = lastSegment.bestSegment + comparisonTime - sob;
    updateSplitTimes();
});

sobButton.addEventListener("click", e => {
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment;
    });
    updateSplitTimes();
});

percentButton.addEventListener("click", e => {
    percent(1 + 0.001 * parseInt(percentSlider.value));
});

percentSlider.addEventListener("input", e => {
    const percentage = parseInt(percentSlider.value);
    let displayed = percentage + "%";
    while (displayed.length < 4) {
        displayed = "0" + displayed;
    }
    displayed = displayed.substring(0, 2) + "." + displayed.substring(2, 4);
    if (displayed[0] == "0") {
        displayed = displayed.substring(1, 5);
    }
    percentButton.innerHTML = displayed;
    percent(1 + 0.001 * percentage);
});

methodButtons.forEach(button => {
    button.addEventListener("change", e => {
        timingMethod = e.target.value;
        initializeCustomization();
    });
});

decimalButtons.forEach(button => {
    button.addEventListener("change", e => {
        decimals = parseInt(e.target.value);
        updateSplitTimes();
        segments.forEach(segment => {
            segment.slider.step = 10 ** (3 - decimals);
        });
    });
});

timesaveButtons.forEach(button => {
    button.addEventListener("change", e => {
        timesave = parseInt(e.target.value);
        segments.forEach(segment => { 
            segment.slider.max = segment.bestSegment + timesave;
        });
        updateSplitTimes();
    });
});

copy.addEventListener("click", e => {
    let comparison = "";
    segments.forEach(segment => {
        const time = segment.splitTimeDiv.textContent;
        comparison += time == "-" ? "\n" : time + "\n";
    });
    navigator.clipboard.writeText(comparison);
    copied.classList.remove("hidden");
    setTimeout(() => {
        copied.classList.add("hidden");
    }, 1000);
});

function handleFileDrop(files) {
    if (files.length != 1) {
        alert("Must drop a file");
    } else {
        const reader = new FileReader();
        reader.onload = () => {
            parseXML(reader.result);
        };
        reader.readAsText(files[0]);
    }
}

function parseXML(xml) {
    const parser = new DOMParser();
    splitsXML = parser.parseFromString(xml, "text/xml");
    if (splitsXML.querySelector("parsererror")) {
        alert("Could not parse file as XML");
    } else {
        initializeCustomization();
    }
}

function initializeCustomization() {
    homepage.classList.add("hidden");
    customization.classList.remove("hidden");

    comparisonDiv.innerHTML = "";
    segments = [];
    splitList.innerHTML = "";
    comparisons.forEach(comparison => {
        comparison.button.remove();
    });
    comparisons = [];

    const segmentXMLs = splitsXML.querySelectorAll("Segment");
    segmentXMLs.forEach(segmentXML => {
        const segment = new Segment(segmentXML, decimals, timesave, timingMethod);

        const splitTimeXMLs = segmentXML.querySelectorAll("SplitTime");
        splitTimeXMLs.forEach(splitTimeXML => {

            const comparisonName = splitTimeXML.getAttribute("name");
            let comparison = null;
            for (let i = 0; i < comparisons.length; i++) {
                if (comparisons[i].name === comparisonName) {
                    comparison = comparisons[i];
                    break;
                }
            }
            if (comparison == null) {
                comparison = new Comparison(comparisonName);
                comparisons.push(comparison);
            }

            const timeXML = splitTimeXML.querySelector(timingMethod);
            if (timeXML) {
                comparison.splitTimes.push(ms(timeXML.textContent));
            } else {
                comparison.splitTimes.push(null);
            }
        });
        
        segment.initializeSlider(updateSplitTimes);
        segments.push(segment);
        splitList.appendChild(segment.nameDiv);
        splitList.appendChild(segment.comparisonDiv);
        splitList.appendChild(segment.slider);
        splitList.appendChild(segment.splitTimeDiv);
    });

    if (comparisons.length > 0) {
        comparisons[0].button.click();
    } else {
        sobButton.click();
    }
}

function updateSplitTimes() {
    let total = 0;
    segments.forEach(segment => {
        if (segment.comparisonSegment == 0) {
            segment.splitTimeDiv.textContent = "-";
            segment.comparisonDiv.textContent = "-";
            segment.slider.value = segment.slider.min;
        } else {
            total += segment.comparisonSegment;
            segment.splitTimeDiv.textContent = time(total);
            segment.comparisonDiv.textContent = time(segment.comparisonSegment);
            segment.slider.value = segment.comparisonSegment;
        }
    });
    comparisonTime = total;
    comparisonDiv.textContent = time(comparisonTime);
}

function percent(percentage) {
    segments.forEach(segment => {
        segment.comparisonSegment = Math.floor(segment.bestSegment * percentage);
    });
    updateSplitTimes();
}

function calculateSumOfBest() {
    let sob = 0;
    segments.forEach(segment => {
        sob += segment.bestSegment;
    });
    return sob;
}

function ms(time) {
    const regex = /(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;
    const match = time.match(regex);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        const milliseconds = match[4] ? parseInt(match[4].substring(0, 3)) : 0;
        return milliseconds + seconds * 1000 + minutes * 60000 + hours * 3600000;
    } else {
        return -1;
    }
}

function time(ms) {
    if (ms < 0) {
        return "";
    }

    const hours = Math.floor(ms / 3600000);
    ms = ms % 3600000;
    const minutes = Math.floor(ms / 60000);
    ms = ms % 60000;
    const seconds = Math.floor(ms / 1000);
    ms = ms % 1000;

    let res = "";
    if (hours > 0) {
        res += `${hours}:`;
        if (minutes < 10) {
            res += "0";
        }
        res += `${minutes}:`;
        if (seconds < 10) {
            res += "0";
        }
    } else if (minutes > 0) {
        res += `${minutes}:`;
        if (seconds < 10) {
            res += "0";
        }
    }
    res += `${seconds}.`;
    if (ms < 100) {
        res += "0";
    }
    if (ms < 10) {
        res += "0";
    }
    res += `${ms}`;

    if (decimals == 0) {
        return res.substring(0, res.length - 4);
    } else {
        return res.substring(0, res.length - 3 + decimals);
    }
}

class Segment {

    // data
    name = "";
    bestSegment = 0;
    comparisonSegment;

    // html elements
    nameDiv;
    comparisonDiv;
    splitTimeDiv;
    slider;

    constructor(xml) {

        const nameXML = xml.querySelector("Name");
        if (nameXML) {
            this.name = nameXML.textContent;
        }

        this.nameDiv = document.createElement("div");
        this.nameDiv.classList.add("segment-name");
        this.nameDiv.textContent = this.name;

        const bestSegmentXML = xml.querySelector(`BestSegmentTime > ${timingMethod}`);
        if (bestSegmentXML) {
            this.bestSegment = ms(bestSegmentXML.textContent);
        }
    
        this.comparisonSegment = this.bestSegment;
        this.comparisonDiv = document.createElement("div");
        this.comparisonDiv.classList.add("time");
        this.comparisonDiv.textContent = time(this.comparisonSegment);

        this.splitTimeDiv = document.createElement("div");
        this.splitTimeDiv.classList.add("time");

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.classList.add("segment-slider");
        this.slider.min = this.bestSegment;
        this.slider.max = this.bestSegment + timesave;
        this.slider.step = 10 ** (3 - decimals);
        this.slider.value = this.slider.min;
    }

    initializeSlider(callback) {
        this.slider.addEventListener("input", e => {
            this.comparisonSegment = parseInt(this.slider.value);
            this.comparisonDiv.textContent = time(this.comparisonSegment);
            callback();
        });
    }
}

class Comparison {

    splitTimes = [];
    name;
    button;

    constructor(name) {
        this.name = name
        this.button = document.createElement("button");
        this.button.innerHTML = this.name;
        this.button.addEventListener("click", e => {
            let lastSplitTime = 0;
            for (let i = 0; i < segments.length; i++) {
                if (this.splitTimes[i]) {
                    segments[i].comparisonSegment = this.splitTimes[i] - lastSplitTime;
                    lastSplitTime = this.splitTimes[i];
                } else {
                    segments[i].comparisonSegment = 0;
                }
            }
            updateSplitTimes();
        });
        comparisonsDiv.appendChild(this.button);
    }
}
