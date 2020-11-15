var svgSymbols = [];
var symbolNames = [];
var selectedSymbols = {};
var symbolDefs={};
var prevIDDrawn = "";
var currIdx= -1;
var mode="import"; // either import or edit ...
var editSrc = "";
var editTarget = "<svg id=\"bViews-symbolDisplayed\"></svg>";
var editWidth = "";
var iconListSrc = "";
var importStart = -1;
var importEnd = -1;
var importSrc = "";
var importTarget = "";
var importWidth = "";
var importFile = "demos/collection1.svg";
var initializedSymbols = false;
var srcWrapper = "height:159px; width:157px; padding: 15px;";
var targetSymbols = [];
var targetSymbolDefs = [];
var targetSymbolIds = {};
const reader = new FileReader();
const parser = new DOMParser();

 /**
  * Initializing the first screen ...
  */
 function initializeAndImport() {

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("get", importFile, true);
    xmlhttp.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
	    processResult(this);
	}
    };
    xmlhttp.send(null);

    reader.onload=function(){
	console.log(reader.result);
    }

    srcSelector = document.getElementById('srcSelector');

    srcSelector.addEventListener("change", function(){
	fileSelected = this.files[0];
	console.log('fileSelected : '+fileSelected.name);
	reader.readAsText(fileSelected);
    });
}

var xmlResp;
function processResult(xmlhttp) {
    xmlResp = xmlhttp.responseXML;
    let b = document.body;
    let svgSprite = getSvgElementFromContents(xmlResp);
    svgSprite.childNodes.forEach(function(elem) {
	if(elem.tagName == "symbol"){
	    symbolNames.push(elem.id);
	    symbolDefs[elem.id] = svgSymbols.length; // just a pointer into svgSymbols...
	    selectedSymbols[elem.id] = false;
	    svgSymbols.push(elem);
	}
    });
    b.innerHTML = svgSprite.outerHTML + b.innerHTML;
    initializedSymbols = true;
    loadSymbols();
    purgeNonSymbols();
}


function getSvgElementFromContents(contents){
    let i=0;
    while(contents.childNodes[i].nodeName !== "svg" && i < contents.childNodes.length)    i++;
    if(i < contents.childNodes.length) return contents.childNodes[i];
    // TODO: further input checking ... to do
    alert('Input file is not a valid sprite.');
}

/**
 * Two modes
 * a) Import - all functionality related to input, output of icon sets
 * b) Edit - all functionality related to editing individual svg and saving the definitions
 */
function ikonizer(){
    if (mode=="import"){
	mode = "edit";
	setEditView();
    }
    else {
	mode = "import";
	setImportView();
    }
}

/**
 * Code related to Importing a Source file and selecting symbols as well as exporting target symbols...
 */

 function setImportView() {
    let iconL = document.getElementById('iconList');
    let viewerEditor = document.getElementById('viewerEditor');

    // Remove Preview area for Import View...
    iconL.style.display = "none";
    viewerEditor.style.height = "91%";

    //Button set to hide
    let bHide = document.getElementById('editButtons');
    //Button set to display
    let bDispl = document.getElementById('importButtons');
    bHide.style.display="none";
    bDispl.style.display="";

    let src = document.getElementById('srcArea');
    let target = document.getElementById('targetArea');
    src.style.contentEditable = false;
    src.style.display="flex";

    computeImportSrc();
    computeImportTarget();
    src.innerHTML = importSrc;
    target.innerHTML = importTarget;
}

// Code related to input/output of svg sprites ...
// File Input - https://javascript.info/file
var fileContents = "";
function readFile(input) {
    let file = input.files[0];

    let reader = new FileReader();
    reader.readAsText(file);

    reader.onload = function() {
//	console.log(reader.result);
	fileContents = reader.result;
	processFile(reader.result);
    };

    reader.onerror = function() {
	console.log(reader.error);
    };
}

var srcToBeImported;
function processFile(srcImportedByUser) {
    let svgSprite = "";

    srcToBeImported = parser.parseFromString(srcImportedByUser, "text/xml");

    //	 console.log(xmlDoc);
    suffixes = ["","1","2","3"];
    let b = document.body;
    svgSprite = getSvgElementFromContents(srcToBeImported);
    let updatedSymbolNames = [];
    let updatedSvgSymbols = [];
    let svgDef = document.body.childNodes[0];
    let previousFirstSymbol = svgDef.childNodes[0];
    svgSprite.childNodes.forEach(function(elem) {
	if(elem.tagName == "symbol"){
	    suffixId = 0;
	    while(suffixId < suffixes.length && (symbolDefs[elem.id + suffixes[suffixId]] !== undefined))
		    suffixId++;
	    if(symbolDefs[elem.id+suffixes[suffixId]] !== undefined){
		    alert('Unable to import ' + elem.id + '. Already defined (and renamed three times) ...');
		    return;
	    }
	    elem.id = elem.id + suffixes[suffixId];
        svgDef.insertBefore(elem, previousFirstSymbol);
        updatedSymbolNames.push(elem.id);
	    symbolDefs[elem.id] = updatedSvgSymbols.length; // symbolDefs will need to be reset for existing elements. Done next...
	    updatedSvgSymbols.push(elem);
	    selectedSymbols[elem.id] = false; // no changes for this needed in next iterations...
	}

    });
    // b.innerHTML = svgSprite.outerHTML + b.innerHTML;

    for(let i=0; i < svgSymbols.length; i++) {
	elem = svgSymbols[i];
	updatedSymbolNames.push(elem.id);
	symbolDefs[elem.id] = updatedSvgSymbols.length;
	updatedSvgSymbols.push(elem);
    }

    svgSymbols = updatedSvgSymbols;
    symbolNames = updatedSymbolNames;

    initializedSymbols = true;
    loadSymbols();
    purgeNonSymbols();
}

function purgeNonSymbols(){
    c0 = document.body.childNodes[0];
    for(let i=0; i < c0.childNodes.length; i++){
	if(c0.childNodes[i].nodeName !== "symbol")
	    c0.removeChild(c0.childNodes[i]);
    }
}

var license ="<!--\nGenerated by Ikonizer developed by @bitwiseviews - https://bitwiseviews.github.io/ikonizer -->\n";

function obtainTargetSprite(){
    let header = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"+license+
	"<svg xmlns=\"http://www.w3.org/2000/svg\" style=\"display: none;\">\n";
    let targetSymbolsOut = "";
    for(let i=0 ; i < targetSymbols.length; i++){
	    targetSymbolsOut += "  "+document.getElementById(targetSymbols[i]).outerHTML+"\n";
    }
    let footer = "</svg>\n";

    return (header + targetSymbolsOut + footer);
}

function downloadTargetAsSvgSprite(){
    let link = document.createElement('a');
    link.download = 'spriteOutput.svg';

    let generatedSprite = obtainTargetSprite();
    let blob = new Blob([generatedSprite], {type: 'image/svg+xml'});

    link.href = URL.createObjectURL(blob);

    link.click();

    URL.revokeObjectURL(link.href);
}

var firstTimeLoad = true;
function loadSymbols(){
    let target = document.getElementById('targetArea');
    importTarget = target.innerHTML;
    let s = document.getElementById('start');
    let nSymb = document.getElementById('nSymbols');
    let startIdx = +s.value;
    let nSymbols = +nSymb.value;
    if(firstTimeLoad) {
	    nSymbols = svgSymbols.length + 1;// to ensure all symbols selected ...
	    if(nSymbols > 50)
	        nSymbols = 50;
        importStart = 0;
        firstTimeLoad = false;
    }
    let endIdx = startIdx + nSymbols - 1;

    if(importStart < 0) {
	alert('Incorrect Start Value ... '+s);
	return;
    }

    // Sanity check before assiging to importStart
    if(s.value >= svgSymbols.length){
	alert('Start exceeds available symbols Length.\nReset to 0 ! (previous value : '+importStart+') ');
    s.value = 0;
    // maintain earlier importStart, importEnd values.
    return;
    }

    importStart = startIdx;
    importEnd = endIdx;
    // New value for start
    s.value = (+endIdx) + 1;

    if(importEnd >= svgSymbols.length){
	importEnd = svgSymbols.length - 1;
	s.value = svgSymbols.length; // to denote number of symbols, end of list...
	}

    let srcContainer = document.getElementById('srcContainer');
    let src = document.getElementById('srcArea');
    let targetContainer = document.getElementById('targetContainer');

    //    let target = document.getElementById('targetArea');
    src.contentEditable = "false";
    if(!initializedSymbols)
	alert('Symbols not initialized !!!');
    importSrc = "";

    //    srcContainer.style.flexDirection = "row";
    target.style.display = "flex";
    targetContainer.style.display = "flex";
    targetContainer.style.flexDirection = "row";
    target.style.flexDirection = "row";
    target.style.flexWrap = "wrap";
    targetContainer.style.flexWrap = "wrap";
    targetContainer.style.overflowX = "scroll";
    targetContainer.style.overflowY = "scroll";
    src.style.display = "flex";
    src.style.flexDirection = "row";
    src.style.flexWrap = "wrap";
    for(let i = importStart; i <= importEnd; i++)
	importSrc += getSVGForSrcImport(symbolNames[i])+"\n";
    src.innerHTML =  importSrc;
    setResizer();
}

function computeImportSrc(){
    importSrc = "";
    for(let i=importStart; i<=importEnd; i++)
        importSrc += getSVGForSrcImport(symbolNames[i])+"\n";
}

function computeImportTarget(){
    importTarget = "";
    for(let i=0; i<targetSymbols.length; i++) {
    let currSymbol = targetSymbols[i];
	importTarget += svgForTargetSymbol(currSymbol);
    }
}

function getSVGForSrcImport(symbolName){
    let svgDef = "";
    svgDef = "<div id=\"src-"+symbolName+"\" style=\"width:135px; padding : 15px; display:flex; flex-direction: column\">";
    svgDef += "<svg style=\""+srcWrapper+"\" onclick=\"selectSymbol(\'"+symbolName+"\');\"><use xlink:href=\"#"+symbolName+"\"></use>";
    svgDef += "</svg>";
    if(selectedSymbols[symbolName] !== false)
	svgDef += "<label style=\"text-align:center; background-color: black; color : white;\" " +
	"contentEditable=\"false\" onclick=\"selectSymbol(\'"+symbolName+"\');\" id=\"label-"+symbolName+"\">"+symbolName+"</label>";
    else
	svgDef += "<label style=\"text-align:center\" " +
	"contentEditable=\"false\" onclick=\"selectSymbol(\'"+symbolName+"\');\" id=\"label-"+symbolName+"\">"+symbolName+"</label>";
    svgDef += "</div>";
    return svgDef;
}

function svgForTargetSymbol(symbolName){
    let targetSymbol ="";
    //symbolName = svgSymbols[symbolIdx].id;
    targetSymbol += "<div id=\"target-"+symbolName+"\" style=\"display: flex; flex-direction:column; height:139px;\" "+
    "onclick = \"selectSymbol('"+symbolName+"');\">";
    targetSymbol += "<svg width=\"57px\" height=\"37px\" style=\"padding:7px;\"><use xlink:href=\"#"+symbolName+"\"/></svg>";
    targetSymbol += "<label style=\"text-align:center; width : 57px; height:5px;\" id=\"target-"+symbolName+"\">"+symbolName+"</label>";
    targetSymbol += "</div>";
    return targetSymbol;
}

/**
 * Select, unselect symbols in Import view
 */
function selectSymbol(symbolName){

    if(selectedSymbols[symbolName] !== false) {
	unselectSymbol(symbolName);
	return;
    }

    let target = document.getElementById('targetArea');
    let targetElem = document.getElementById('target-'+symbolName);
    if(targetElem !== null) { // TO remove that hidden element ... recompute target area
	console.log('element exists');
	target.innerHTML = "";
	for(let i=0; i<targetSymbols.length; i++) {
	    let currSymbol = targetSymbols[i];
	    target.innerHTML += svgForTargetSymbol(currSymbol);
	}
	}
    targetSymbolIds[symbolName] = targetSymbols.length;
    targetSymbols.push(symbolName);
    let symbolDef = document.getElementById(symbolName);
    // not needed now ...
    targetSymbolDefs.push(symbolDef);
    selectedSymbols[symbolName] = true;

    let label = document.getElementById("label-"+symbolName);
    label.style.color = "white";
    label.style.backgroundColor = "black";
    label.contentEditable = false;
    label.cursor = '';
    target.innerHTML =  target.innerHTML + svgForTargetSymbol(symbolName);
    importTarget = target.innerHTML;
    let latestSymbol = document.getElementById('target-'+symbolName);
    latestSymbol.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
}

function unselectSymbol(symbolName){
    let elemID = document.getElementById('target-'+symbolName);
    elemID.style.display="none";

    let label = document.getElementById("label-"+symbolName);
    if(label !== undefined && label !== null) {
	label.style.color = "black";
	label.style.backgroundColor = "white";
	label.contentEditable = false;
    }

    let i = 0;
    for(;i<targetSymbols.length && targetSymbols[i] !== symbolName; i++)
    ;
    let targetSymbolIdx = i;
    if(targetSymbolIdx<targetSymbols.length) {
	targetSymbols.splice(targetSymbolIdx,1);
	targetSymbolDefs.splice(targetSymbolIdx,1);
    }
    for( ; i<targetSymbols.length; i++) {
	let currSymbol = targetSymbols[i];
	targetSymbolIds[currSymbol] = i;
    }
    selectedSymbols[symbolName] = false;
    targetCopyOnEdit = true;
}

function selectAllSymbols(){
    if(importStart === -1 || importEnd === -1)
	alert('Symbols Need to be Loaded first!');
    let atLeastOneSelected = false;
    for(let i=importStart; i<=importEnd; i++) {
	let currSymbol = svgSymbols[i].id;
	if (selectedSymbols[currSymbol] === true)
	    continue;
	atLeastOneSelected = true;
	selectSymbol(currSymbol);
    }
    if(!atLeastOneSelected){ // Unselect all elements
	for(let i=importStart; i<=importEnd; i++) {
	    let currSymbol = svgSymbols[i].id;
	    unselectSymbol(currSymbol);
	}
    }
}

/**
 * Edit mode related functionality ...
 */
function setEditView() {
    let iconL = document.getElementById('iconList');
    iconListSrc = "";
    // Let's rebuild the icons
    for(let i=0; i<targetSymbols.length; i++) {
	let currSymbol = targetSymbols[i];
	iconListSrc += svgForSymbolInIconList(currSymbol);
    }
    iconL.innerHTML = iconListSrc;
    let viewerEditor = document.getElementById('viewerEditor');

    // Default is to show Preview Area for Edit View...
    iconL.style.display = "flex";
    viewerEditor.style.height = "65%";

    //Button set to hide
    let bHide = document.getElementById('importButtons');
    //Button set to display
    let bDispl = document.getElementById('editButtons');
    bHide.style.display="none";
    bDispl.style.display="";

    let src = document.getElementById('srcArea');
    let target = document.getElementById('targetArea');
	target.innerHTML = "";
	for(let i=0; i<targetSymbols.length; i++) {
	    let currSymbol = targetSymbols[i];
	    target.innerHTML += svgForTargetSymbol(currSymbol);
	}
	importTarget = target.innerHTML;
    importSrc = src.innerHTML;

    src.contentEditable = true;
    src.style.cursor = "auto";
    src.style.display="inline";
    src.innerHTML = editSrc;
    target.innerHTML = editTarget;
}

function drawElem(id){
    currIdx = targetSymbolIds[id];
    let drawArea = document.getElementById('targetArea');
    let dChildren = drawArea.childNodes;
    let svgDraw = undefined;
    let i = 0;
    for(; i< dChildren.length && dChildren[i].tagName !== "svg"; i++);
    if( i < drawArea.childNodes.length) // then drawArea.childNodes[i].tagName === "svg"	     
	svgDraw = document.getElementById('targetArea').childNodes[i];
    else {
	document.innerHTML = "<svg id=\"bitwiseViews-symbolDisplayed\"></svg>"; //reset drawing area ...
	for(let i =0; i< drawArea.childNodes.length && drawArea[i].tagName !== "svg"; i++);
	if( i < drawArea.childNodes.length) // then drawArea.childNodes[i].tagName === "svg"	     
	    svgDraw = document.getElementById('targetArea').childNodes[i];
	else {
	    alert('Error while resetting the drawing area');
	    return;
	}
    }

    let symbol = svgSymbols[symbolDefs[id]];
    let viewB = symbol.getAttribute('viewBox');
    let ikonLabel = document.getElementById('ikonLabel-'+id);
    ikonLabel.style.color = "white";
    ikonLabel.style.backgroundColor = "black";

    if(prevIDDrawn !== "" && prevIDDrawn !== id) {
	let prevIkonLabel = document.getElementById('ikonLabel-'+prevIDDrawn);
	if(prevIkonLabel !== undefined) {
	    prevIkonLabel.style.color = "black";
	    prevIkonLabel.style.backgroundColor = "white";
	}
    }

    prevIDDrawn = id;

    svgDraw.setAttribute('viewBox', viewB);
    viewBL = viewB.split(" ");
    svgDraw.setAttribute('width', viewBL[2]+"px");
    svgDraw.setAttribute('height', viewBL[3]+"px");
    svgDraw.innerHTML = symbol.innerHTML;
    editTarget = drawArea.innerHTML;
    getSrcForImage();
    setResizer();
}

var endAlert = false;
var startAlert = false;
function getNextSymbol(){
    if(currIdx >= targetSymbols.length - 1) {
	if(!endAlert)
	    alert('Last svgSymbol Reached!!!');
	endAlert = true;
	return;
    }

    endAlert = false;
    startAlert = false;
    nextSymbol = targetSymbols[currIdx+1];
    let svgEl = document.getElementById('ikon-svg-'+nextSymbol);
    svgEl.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    svgEl.click();
    resizer = document.getElementById('dragMe');
    resizer.style.cursor = "ew-resize";
}

function getPreviousSymbol(){
    if(currIdx <= 0) {
	if(!startAlert)
	    alert('At First Symbol!!!');
	startAlert = true;
	currIdx = 0;
	return;
    }

    endAlert = false;
    startAlert = false;
    if(currIdx >= targetSymbols.length)
	currIdx = targetSymbols.length - 1;
    // currIdx--; currIdx set appropriately
    let prevSymbol = targetSymbols[currIdx - 1];
    let svgEl = document.getElementById('ikon-svg-'+prevSymbol);
    svgEl.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    svgEl.click();
    resizer = document.getElementById('dragMe');
    resizer.style.cursor = "ew-resize";
}

function clearDrawingArea(){
    let svgDraw = document.getElementById('targetArea');
    svgDraw.innerHTML = "<svg id=\"bitwiseViews-symbolDisplayed\"></svg>"; //reset drawing area ...
}

function getSrcForImage(){
    let svgDraw = document.getElementById('targetArea');
    let svg = svgDraw.innerHTML;
    let src = document.getElementById('srcArea');
    src.innerText = svg;
    src.style.display="inline";
    // src.contentEditable="true";
    src.style.cursor = "auto";
    editSrc = src.innerHTML;
}

function drawImageForSrc(){
    let svgSrc = document.getElementById('srcArea');
    let src = svgSrc.innerText;
    let svg = document.getElementById('targetArea');
    svg.innerHTML = src;
}

function iconListVisibility(){
    let iconL = document.getElementById('iconList');
    let viewerEditor = document.getElementById('viewerEditor');
    let display = iconL.style.display;

    if(display === "none") {
	iconL.style.display = "flex";
	viewerEditor.style.height = "65%";
    } else {
	iconL.style.display = "none";
	viewerEditor.style.height = "91%";
    }
}

function svgForSymbolInIconList(symbolName){
    let targetSymbol ="";
    // symbolName = svgSymbols[symbolIdx].id;

    targetSymbol += "<div id=\"ikon-"+symbolName+"\" style=\"display: flex; flex-direction:column; \"> "+
	"<div id=\"ikon-svg-"+symbolName+"\" onclick = \"drawElem('"+symbolName+"');\" style=\"\">"+
	"<svg style=\"border:1px solid green; display:inline;\"><use xlink:href='#"+symbolName+"' /></svg>"+
	"</div>"+
	"<label style=\"text-align : center;\" onclick=\"modifyLabel('"+symbolName+"');\" "+
	"id=\"ikonLabel-"+symbolName+"\">"+ symbolName +"</label>"; // class=\"items-center justify-center\"
    targetSymbol += "</div>";
    return targetSymbol;
}

function duplicateCurrentlySelected(){
    if(currIdx < 0 || currIdx >= targetSymbols.length){
	alert('No Symbol currently Selected !');
	return;
    }
    let currSymbolName = targetSymbols[currIdx];
    if(Object.keys(symbolDefs).includes(currSymbolName+'-copy')){
	alert('copy of '+currSymbolName+' already exists. Rename existing copy first');
	return;
    }
    let currSvgDefs = document.body.childNodes[0];
    let svgIdx = symbolDefs[targetSymbols[currIdx]];
    let currSymbolDef  = currSvgDefs.childNodes[svgIdx];
    let clonedNode = currSymbolDef.cloneNode();
    clonedNode.id = currSymbolName+'-copy';
    clonedNode.innerHTML = currSvgDefs.childNodes[svgIdx].innerHTML;
    // First, definition ...
    currSvgDefs.insertBefore(clonedNode, currSymbolDef);
    svgSymbols.splice(svgIdx, 0, clonedNode);
    symbolDefs[clonedNode.id] = svgIdx;
    // Then, for current view in iconList
    let elem = document.getElementById('ikon-'+currSymbolName);
    let elemClone = elem.cloneNode();
    elemClone.id = clonedNode.id;
    elemClone.innerHTML = svgForSymbolInIconList(svgSymbols[svgIdx].id);
    elem.parentElement.insertBefore(elemClone, elem);

    targetSymbols.splice(currIdx, 0, elemClone.id);
    targetSymbolDefs.splice(currIdx, 0, elemClone);
    targetSymbolIds[clonedNode.id] = currIdx;
}

function reLabel(symbolName, newName){
    let targetIdx = targetSymbolIds[symbolName];
    targetSymbols[targetIdx] = newName;
    targetSymbolIds[newName] = targetSymbolIds[symbolName];  // Change object targetSymbolIds
    symbolIdx = symbolDefs[symbolName];
    symbolDefs[newName] = symbolDefs[symbolName]; // this is also an object
    symbolNames[symbolIdx] = newName;
    svgSymbols[symbolIdx].id = newName;
    // svg element for sprites definition from src ...
    currentSpriteDefs = document.body.childNodes[0];
    currentSpriteDefs.childNodes[symbolIdx].id = newName;
    let elem1 = document.getElementById('ikon-'+symbolName);
    elem1.innerHTML = svgForSymbolInIconList(svgSymbols[symbolIdx].id);
    if(prevIDDrawn === symbolName){
	prevIDDrawn = newName;
	let elem = document.getElementById('ikonLabel-'+newName);
	elem.style.color = "white";
	elem.style.backgroundColor = "black";
    }
    delete symbolDefs[symbolName];
//    t.childNodes[0].childNodes[0].attributes['xlink:href']='#'+newName;
}

var labelEdit=false;
function modifyLabel(symbolName){
    targetId = targetSymbolIds[symbolName];
    let currSymbolLabel = document.getElementById('ikonLabel-'+symbolName);
    let newLabel = window.prompt('Enter new label ', symbolName);
    if (newLabel === "" || newLabel === symbolName || newLabel === undefined || newLabel === null) // need to check input here ...
	return;

    if(Object.keys(symbolDefs).includes(newLabel)) {
	    alert('Label : \''+newLabel+'\' already defined in loaded source!');
//	    currSymbolLabel.contentEditable = true;
	    return;
    }
    reLabel(symbolName, newLabel);
//    else	currSymbolLabel.contentEditable = true;
    console.log('modifying label for '+symbolName);
}

/**
resizerFunction from https://github.com/Azarlak/EvoCiv

The MIT License (MIT)

Copyright (c) 2016 Andrej Hristoliubov <anhr@mail.ru>
*/
var resizerFunction = function() {

    // Query the element
    let resizer = document.getElementById('dragMe');
    let leftSide = resizer.previousElementSibling;
    let rightSide = resizer.nextElementSibling;

    // The current position of mouse
    let x = 0;
    let y = 0;
    let leftWidth = 0;

    // Handle the mousedown event
    // that's triggered when user drags the resizer
    const mouseDownHandler = function(e) {
        // Get the current mouse position
        x = e.clientX;
        y = e.clientY;
        leftWidth = leftSide.getBoundingClientRect().width;

        // Attach the listeners to `document`
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    const mouseMoveHandler = function(e) {
        // How far the mouse has been moved
        const dx = e.clientX - x;
        const dy = e.clientY - y;

        const newLeftWidth = (leftWidth + dx) * 100 / resizer.parentNode.getBoundingClientRect().width;
        leftSide.style.width = `${newLeftWidth}%`;

        resizer.style.cursor = 'col-resize';
        document.body.style.cursor = 'col-resize';

        leftSide.style.userSelect = 'none';
        leftSide.style.pointerEvents = 'none';

        rightSide.style.userSelect = 'none';
        rightSide.style.pointerEvents = 'none';
    };

    const mouseUpHandler = function() {
        resizer.style.removeProperty('cursor');
        document.body.style.removeProperty('cursor');

        leftSide.style.removeProperty('user-select');
        leftSide.style.removeProperty('pointer-events');

        rightSide.style.removeProperty('user-select');
        rightSide.style.removeProperty('pointer-events');

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
	resizer.style.cursor = "ew-resize";
    };

	 // Attach the handler
    resizer.addEventListener('mousedown', mouseDownHandler);
};

function setResizer(){
    resizerFunction();
    let resizer = document.getElementById('dragMe');
    resizer.style.cursor = "ew-resize";
}

// function saveSymbol(){
//     if(currIdx < 0){
// 	alert('No Current Symbol !');
// 	return;
//     }

//     let currSymbol = targetSymbols[currIdx];
//     let src = document.getElementById('srcArea');
//     let result = parser.parseFromString(src.innerText, "text/xml");
//     document.getElementById(currSymbol).innerHTML =     result.childNodes[0].innerHTML;
//     svgSymbols[currIdx].childNodes =     result.childNodes[0].childNodes;
// }
