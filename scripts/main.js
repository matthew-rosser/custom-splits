const homepage = document.getElementById("homepage");
const example = document.getElementById("example");
const fileInput = document.getElementById("file");
const uploadBox = document.getElementById("upload");
const customization = document.getElementById("customization");
const back = document.getElementById("back");
const balancedButton = document.getElementById("balanced");
const equalButton = document.getElementById("equal");
const pbButton = document.getElementById("pb");
const sobButton = document.getElementById("sob");
const percentButton = document.getElementById("percent");
const percentSlider = document.getElementById("percent-slider");
const methodButtons = document.querySelectorAll('input[name="method"]');
const decimalButtons = document.querySelectorAll('input[name="decimal"]');
const comparisonDiv = document.getElementById("comparison-time");
const splitList = document.getElementById("split-list");
const copy = document.getElementById("copy");

let timingMethod = "RealTime";
let decimals = 1;
let comparisonTime = 0;
let timesave = 30000;
let splitsXML = null;
let segments = [];

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
    homepage.style.display = "block";
    customization.style.display = "none";
    fileInput.value = null;
});

equalButton.addEventListener("click", equalTimesave);

balancedButton.addEventListener("click", e => {
    let sob = calculateSumOfBest();
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment 
            + Math.floor((comparisonTime - sob) 
            * (segment.bestSegment / sob));
    });
    updateSplitTimes();
});

pbButton.addEventListener("click", e => {
    segments.forEach(segment => {
        segment.comparisonSegment = segment.pbSegment;
    });
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
        initializeCustomization(splitsXML);
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

copy.addEventListener("click", e => {
    let comparison = "";
    segments.forEach(segment => {
        comparison += time(segment.splitTime, decimals) + "\n";
        copy.classList.add("copied");
        copy.innerHTML = "Copied!";
        setTimeout(() => {
            copy.classList.remove("copied");
            copy.innerHTML = "Copy Comparison";
        }, 1000);
    });
    navigator.clipboard.writeText(comparison);
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
    const splits = parser.parseFromString(xml, "text/xml");
    if (splits.querySelector("parsererror")) {
        alert("Could not parse file as XML");
    } else {
        initializeCustomization(splits);
    }
}

function initializeCustomization(splits) {
    homepage.style.display = "none";
    customization.style.display = "block";

    if (splits) {
        console.log(splits);
        comparisonDiv.innerHTML = "";
        splitsXML = splits;
        segments = [];
        splitList.innerHTML = "";
        let lastSplitTime = 0;

        const segmentXMLs = splits.querySelectorAll("Segment");
        segmentXMLs.forEach(segmentXML => {
            const segment = new Segment(segmentXML, decimals, timesave, timingMethod);
            const splitTime = ms(segmentXML.querySelector(
                `SplitTime[name="Personal Best"] > ${timingMethod}`).textContent);
            segment.pbSegment = splitTime - lastSplitTime;
            lastSplitTime = splitTime;
            
            segment.initializeSlider(updateSplitTimes);
            segments.push(segment);
            splitList.appendChild(segment.container);
        });

        comparisonTime = lastSplitTime;
        comparisonDiv.innerHTML = time(comparisonTime, decimals);
    
        equalTimesave();
    }
}

function updateSplitTimes() {
    let total = 0;
    segments.forEach(segment => {
        total += segment.comparisonSegment;
        segment.splitTime = total;
        segment.splitTimeDiv.textContent = time(segment.splitTime, decimals);
        segment.comparisonDiv.textContent = time(segment.comparisonSegment, decimals);
        segment.slider.value = segment.comparisonSegment;
    });
    comparisonTime = total;
    comparisonDiv.innerHTML = time(comparisonTime, decimals);
}

function equalTimesave() {
    let sob = calculateSumOfBest();
    segments.forEach(segment => {
        segment.comparisonSegment = segment.bestSegment 
            + Math.floor((comparisonTime - sob) / segments.length);
    });
    updateSplitTimes();
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
    name;
    bestSegment;
    pbSegment;
    comparisonSegment;
    splitTime;

    // html elements
    nameDiv;
    comparisonDiv;
    splitTimeDiv;
    slider;
    container;

    constructor(xml) {

        this.name = xml.querySelector("Name").textContent;
        this.nameDiv = document.createElement("td");
        this.nameDiv.classList.add("segment-name");
        this.nameDiv.textContent = this.name;

        this.bestSegment = ms(xml.querySelector(`BestSegmentTime > ${timingMethod}`).textContent);
    
        this.comparisonSegment = this.bestSegment;
        this.comparisonDiv = document.createElement("td");
        this.comparisonDiv.classList.add("time");
        this.comparisonDiv.textContent = time(this.comparisonSegment);

        this.splitTimeDiv = document.createElement("td");
        this.splitTimeDiv.classList.add("time");

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.classList.add("segment-slider");
        this.slider.min = this.bestSegment;
        this.slider.max = this.bestSegment + timesave;
        this.slider.step = 10 ** (3 - decimals);
        this.slider.value = this.slider.min;

        const sliderCell = document.createElement("td");
        sliderCell.appendChild(this.slider);

        this.container = document.createElement("tr");
        this.container.appendChild(this.nameDiv);
        this.container.appendChild(this.comparisonDiv);
        this.container.appendChild(sliderCell);
        this.container.appendChild(this.splitTimeDiv);
    }

    initializeSlider(callback) {
        this.slider.addEventListener("input", e => {
            this.comparisonSegment = parseInt(this.slider.value);
            this.comparisonDiv.textContent = time(this.comparisonSegment, decimals);
            callback();
        });
    }
}
