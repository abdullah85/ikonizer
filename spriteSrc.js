/*
MIT License

Copyright (c) 2020 bitwiseviews --- https://bitwiseviews.github.io/ikonizer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
Acknowledgements

- resizerFunction from https://github.com/Azarlak/EvoCiv

The MIT License (MIT)

Copyright (c) 2016 Andrej Hristoliubov <anhr@mail.ru>

- codemirror from https://codemirror.net/index.html

MIT License

Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others
*/
var svgSymbols = [];
var symbolNames = [];
var selectedSymbols = {};
var symbolDefs={};
var prevIDDrawn = "";
var currIdx= -1;
var mode="import"; // either import or edit ...
var editSrc = null; // null indicates not switched to edit mode yet ...
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
var srcEditor; // an instance of CodeMirror for editing.

var cmOptions = {
    lineNumbers: true,
    tabSize: 2,
    mode: 'xml'
};

/**
 * Initializing the first screen ...
 */
function initializeAndImport() {
    //myCodeMirror = CodeMirror(document.body);
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("get", importFile, true);
    xmlhttp.onreadystatechange = function() {
	if (this.readyState == 4 && this.status == 200) {
	    processResult(this);
//	    traceMode(); // for automatically switching to trace mode ... for testing ...
	}
    };
    xmlhttp.send(null);

    reader.onload=function(){
	console.log(reader.result);
	document.getElementById('buttonWrapper').style.overflowX = "scroll";
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
     let viewerEditor = document.getElementById('viewerEditor');
     let srcContainer = document.getElementById('srcContainer');    
     let iconL = document.getElementById('iconList');

    // Remove Preview area for Import View...
    iconL.style.display = "none";
    viewerEditor.style.height = "597px";
    editWidth = srcContainer.style.width;
    // set width for import
    srcContainer.style.width = importWidth;

    //Button set to hide
    document.getElementById('subButtonsWrapper').style.display = "none";    
    let bHide1 = document.getElementById('editButtons');
    let bHide2 = document.getElementById('srcEditButtons');
    let bHide3 = document.getElementById('traceButtons');
    bHide1.style.display="none";
    bHide2.style.display="none";
    bHide3.style.display="none";
    //Button set to display
    let bDispl = document.getElementById('importButtons');
    bDispl.style.display="";

    let src = document.getElementById('srcArea');
    let target = document.getElementById('targetArea');
    if(editSrc !== null)
	editSrc = srcEditor.doc.getValue();
    computeImportSrc();
    computeImportTarget();
    src.innerHTML = importSrc;
    src.style.contentEditable = false;
    src.style.display="flex";
    target.innerHTML = importTarget;
    srcContainer.className = "w-2\/3";
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
    document.getElementById('start').value = 0;
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

    srcContainer.style.display="flex";
    srcContainer.style.flexDirection  = "row";
    srcContainer.style.flexWrap = "wrap";
    srcContainer.style.overflow = "scroll";
    targetContainer.style.display = "flex";
    targetContainer.style.flexDirection = "row";
    targetContainer.style.flexWrap = "wrap";
    targetContainer.style.overflow = "scroll";
    target.style.display = "flex";
    target.style.flexDirection = "row";
    target.style.flexWrap = "wrap";
    target.style.overflow = "";
    src.style.display = "flex";
    src.style.flexDirection = "row";
    src.style.flexWrap = "wrap";
    src.style.overflow = "";
    src.style.width="579px";

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
    let viewerEditor = document.getElementById('viewerEditor');
    let srcContainer = document.getElementById('srcContainer');    
    let iconL = document.getElementById('iconList');

    iconListSrc = "";
    // Let's rebuild the icons
    for(let i=0; i<targetSymbols.length; i++) {
	let currSymbol = targetSymbols[i];
	iconListSrc += svgForSymbolInIconList(currSymbol);
    }
    iconL.innerHTML = iconListSrc;

    // Default is to hide Preview Area for Edit View...
    iconL.style.display = "none";
    viewerEditor.style.height = "71%";
    srcContainer.className = "w-1\/3";
    importWidth = srcContainer.style.width;
    // set width for edit
    srcContainer.style.width = editWidth;

    //Button set to hide
    let bHide = document.getElementById('importButtons');
    //Button set to display
    document.getElementById('subButtonsWrapper').style.display = "flex";
    let bDispl1 = document.getElementById('editButtons');
    let bDispl2 = document.getElementById('srcEditButtons');    
    let bDispl3 = document.getElementById('traceButtons');
    bHide.style.display="none";
    bDispl1.style.display="flex";
    bDispl2.style.display="flex";
    bDispl2.className="w-1\/3";
    bDispl3.style.display="flex";    

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
    src.style.display="";
    src.innerHTML = "";
    if(editSrc == null){
        editSrc = "";
    }
    srcEditor = CodeMirror(src, cmOptions);
    srcEditor.doc.setValue(editSrc);
    target.innerHTML = editTarget;
}

function resetDrawArea(){
    let drawArea = document.getElementById('targetArea');
    drawArea.innerHTML = "<svg id=\"bViews-symbolDisplayed\"> </svg>";
}

function resetSrcArea(){
    let srcArea = document.getElementById('srcArea');
    srcArea.innerText = "";
}

function drawSymbol(symbolName){
    currIdx = targetSymbols.indexOf(symbolName);
    if(currIdx < 0) {
        alert("symbolName : '"+symbolName+"' not found in target Symbol List.");
        return;
    }

    let targetElem = document.getElementById('bViews-symbolDisplayed');
    let toReset = (targetElem === undefined) || (targetElem === null);
    toReset = toReset ||  (!toReset && targetElem.parentElement === undefined && targetElem.parentElement === null);
    toReset = toReset || targetElem.parentElement.childElementCount !== 1;
    if(toReset) resetDrawArea();

    // Label styling for current versus earlier selected symbol...
    let ikonLabel = document.getElementById('ikonLabel-'+symbolName);
    ikonLabel.style.color = "white";
    ikonLabel.style.backgroundColor = "black";
    if(prevIDDrawn !== "" && prevIDDrawn !== symbolName) {
	let prevIkonLabel = document.getElementById('ikonLabel-'+prevIDDrawn);
	if(prevIkonLabel !== undefined) {
	    prevIkonLabel.style.color = "black";
	    prevIkonLabel.style.backgroundColor = "white";
	}
    }
    prevIDDrawn = symbolName;

    let svgDraw = document.getElementById('bViews-symbolDisplayed');
    let symbol = document.getElementById(symbolName);
    let viewB = symbol.getAttribute('viewBox');
    svgDraw.setAttribute('viewBox', viewB);
    viewBL = viewB.split(" ");
    svgDraw.setAttribute('width', viewBL[2]+"px");
    svgDraw.setAttribute('height', viewBL[3]+"px");
    svgDraw.innerHTML = symbol.innerHTML;
    editTarget = document.getElementById('targetArea').innerHTML;
    getSrcForSymbol(symbol);
    setResizer();
}

/**
 * Only called from within the code ...
 * Copies required svg code from definition to the source area for editing ...
 * On Save all parameters to be saved back to the symbol definition which is canonical location for any symbol definition
 * @param {svg symbol} symbol - An svg symbol with required code within
 */
function getSrcForSymbol(symbol){
    let src = document.getElementById('srcArea');
    editSrc = symbol.outerHTML;
    srcEditor.doc.setValue(editSrc);
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

function validateAndGetSrcElement(){
//    let svgSrc = document.getElementById('srcArea');
    let src = srcEditor.doc.getValue(); //svgSrc.innerText;
    let srcElem = parser.parseFromString(src,"image/svg+xml");
    if(srcElem === undefined || srcElem === null) {
        alert('Unable to parse the provided source!');
        return null;
    }
    if(srcElem.childElementCount!== 1){
        alert('Invalid source ! Must contain exactly one Symbol Node');
        return null;
    }

    let srcSymbol = srcElem.childNodes[0]
    if(srcSymbol.nodeName !== 'symbol'){
        alert('Outermost tag must be of symbol type');
        return null;
    }

    if(srcSymbol.id == undefined || srcSymbol.id === null) {
        alert('symbol must have an id attribute!');
        return null;
    }

    if(srcSymbol.getAttribute('viewBox') === null || srcSymbol.getAttribute('viewBox').split(' ').length !== 4) {
        alert('viewbox attribute must be set with appropriate values!');
        return null;
    }

    return srcSymbol;
}

// May need to clear some of the text elements to get a better node for displaying...
function drawImageForSrc(){
    let srcSymbol = validateAndGetSrcElement();
    if(srcSymbol === null)
        return;
    resetDrawArea();
    let svg = document.getElementById('bViews-symbolDisplayed');
    svg.innerHTML = srcSymbol.innerHTML;
    let viewB = srcSymbol.getAttribute('viewBox');
    svg.setAttribute('viewBox', viewB);
    let viewBL = viewB.split(' ');
    svg.setAttribute('width', viewBL[2]+"px");
    svg.setAttribute('height', viewBL[3]+"px");
}

// For saving the current source area symbol into symbol definition (in target list as well as injected definition)
/**
 * Complete control given to the user by giving preference to whatever is entered in the source.
 * Checks first performed with validateAndGetSrcElement to catch any errors
 */
function saveSymbol(){
    let srcSymbol = validateAndGetSrcElement();
    if(srcSymbol == null)
        return;

    let symbolName = srcSymbol.id;
    let srcElem = document.getElementById('srcArea');
    let newDef = srcEditor.doc.getValue();
    let targetIdx = targetSymbols.indexOf(symbolName);
    let iconL = document.getElementById('iconList');
    let ikonDiv = svgForSymbolInIconList(symbolName);
    let svgL = document.body.childNodes[0];

    /**
     * if srcSymbol.id in targetSymbols ... definition needs to be overwritten
     */
    if(targetSymbols.includes(symbolName)){
	let symbolDef = document.getElementById(symbolName);
	if(symbolDef === null){
	    alert('symbol ('+symbolName+') in list but not defined !');
	    return;
	}

	// No need for any modification to the source area as we have the latest version of the code required already in the editor ...
	// resetSrcArea();
	resetDrawArea();
	if(currIdx === targetIdx) { // we are modifying the selected symbol ... so do the modification
	    symbolDef.outerHTML = newDef;
	} else {
	    alert('Symbol ('+symbolName+') Already Defined!\nTo Overwrite, click Add/Modify again !');
	    prevIDDrawn = symbolName;
	    currIdx = targetIdx;
	}
    } else { // symbolName not in targetSymbols ...
	// Let's now check existing definitions that have been imported
	let existingDef = document.getElementById(symbolName);
	if(existingDef === undefined || existingDef === null) {
	    // New symbol not in existing definitions imported and hence is a new symbol
	    //    and needs to be added to target symbol list for which, we
	    //    a) add/inject new definition into document.body.childNodes[0]
	    //    b) add into IconL and to targetSymbols...
	    if(currIdx < 0 || currIdx >= targetSymbols.length){// place new symbol at first in definition, iconL
		let clonedNode =svgL.childNodes[0].cloneNode(); // at least one element must be there ...
		clonedNode.outerHTML = newDef;
		svgL.insertBefore(clonedNode, svgL.childNodes[0]);
		iconL.innerHTML = ikonDiv + iconL.innerHTML;
		currIdx = 0;
		symbolDefs[symbolName] = 0;
		symbolNames = [];
		for(let i = 0; i < svgL.childNodes.length; i++){
		    symbolNames.push(svgL.childNodes[i].id);
		    symbolDefs[svgL.childNodes[i].id] = i;
		}
	    } else {
		if(prevIDDrawn === "" || prevIDDrawn === symbolName) {
		    alert('prev ID not defined or is current symbol!');
		    return;
		}
		currentNode = svgL.childNodes[symbolDefs[prevIDDrawn]];
		let clonedNode = currentNode.cloneNode(); // at least one element must be there ...
		svgL.insertBefore(clonedNode, currentNode);
		clonedNode.outerHTML = newDef;
		let currIkon = document.getElementById('ikon-'+prevIDDrawn);
		let newIkon = currIkon.cloneNode();
		iconL.insertBefore(newIkon, currIkon);
		newIkon.outerHTML = ikonDiv;
		// Being lazy here ... recomputing symbolDefs, symbolNames...
		targetSymbols.splice(currIdx, 0, symbolName);
		targetSymbolDefs.splice(currIdx, 0, newDef);
		symbolNames = [];
		for(let i = 0; i < svgL.childNodes.length; i++){
		    symbolNames.push(svgL.childNodes[i].id);
		    symbolDefs[svgL.childNodes[i].id] = i;
		}
	    }
	} else { // defined earlier but not selected in target symbol list
	    // treated as modifying an existing definition ... so first load and show ..
	    alert('Symbol Definition  for ('+symbolName+') Exists!\nClick Add/Modify to modify.');
	    iconL.innerHTML = iconL.innerHTML + ikonDiv;
	    currIdx = targetSymbols.length;
	    // TODO: sync change in targetSymbols with Import View (src area)
	    targetSymbols.push(symbolName);
	}
	importEnd++;
    }

    // Highlighting ...
    if(prevIDDrawn !== "" && prevIDDrawn !== symbolName) {
	let prevIkonLabel = document.getElementById('ikonLabel-'+prevIDDrawn);
	if(prevIkonLabel !== undefined) {
	    prevIkonLabel.style.color = "black";
	    prevIkonLabel.style.backgroundColor = "white";
	}
    }
    let currIkonLabel = document.getElementById('ikonLabel-'+symbolName);
    currIkonLabel.style.backgroundColor = "black";
    currIkonLabel.style.color = "white";
    selectedSymbols[symbolName] = true;
    // No need to modify contents  in source area ...
    // srcEditor.doc.setValue(srcSymbol.outerHTML); // srcElem.innerText = srcSymbol.outerHTML; Earlier version ...
    // show the diagram result
    drawImageForSrc();
    let svgEl = document.getElementById('ikon-svg-'+symbolName);
    svgEl.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
    // Change last id drawn ...
    prevIDDrawn = symbolName;
}

function iconListVisibility(){
    let iconL = document.getElementById('iconList');
    let viewerEditor = document.getElementById('viewerEditor');
    let display = iconL.style.display;

    if(display === "none") {
	iconL.style.display = "flex";
	viewerEditor.style.height = "57%";
    } else {
	iconL.style.display = "none";
	viewerEditor.style.height = "71%";
    }
}

function svgForSymbolInIconList(symbolName){
    let targetSymbol ="";
    targetSymbol += "<div id=\"ikon-"+symbolName+"\" style=\"display: flex; flex-direction:column; \"> "+
	"<div id=\"ikon-svg-"+symbolName+"\" onclick = \"drawSymbol('"+symbolName+"');\" style=\"\">"+
	"<svg style=\"border:1px solid green; display:inline;\"><use xlink:href='#"+symbolName+"' /></svg>"+
	"</div>"+
	"<label style=\"text-align : center;\" onclick=\"drawSymbol('"+symbolName+"');\" "  + //" onclick=\"modifyLabel('"+symbolName+"');\" "+
	"id=\"ikonLabel-"+symbolName+"\">"+ symbolName +"</label>"; // class=\"items-center justify-center\"
    targetSymbol += "</div>";
    return targetSymbol;
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
    let leftButtons = document.getElementById('srcEditButtons');
    let rightSide = resizer.nextElementSibling;
    let rightButtons = document.getElementById('traceButtons');
    let buttonSep = document.getElementById('buttonSep');

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
	leftButtons.style.width = leftWidth;

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
	leftButtons.style.width = leftSide.style.width;

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
    buttonSep.addEventListener('mousedown', mouseDownHandler);
};

function setResizer(){
    resizerFunction();
    let resizer = document.getElementById('dragMe');
    resizer.style.cursor = "ew-resize";
}

/**
 * Code related to modifying, tracing source code of svg in Source Editor in Edit mode
 */
const symbParser = new DOMParser();
const moveTo = ['M', 'm'];
const line = ['L', 'l', 'H', 'h', 'V', 'v'];
const cubic = ['C','c','S','s'];
const quad = ['Q','q','T','t'];
const ellArc = ['A', 'a'];
const closeP = ['Z', 'z'];
const commands = [...moveTo, ...line, ...cubic, ...quad, ...ellArc, ...closeP];
let srcExprCommands = commands.reduce( (expr, cmd) => expr === "" ? cmd : expr + "|" + cmd, "");
let reForSrc = new RegExp("(?="+srcExprCommands+")", 'g')
let reSrcLines = new RegExp("(?="+srcExprCommands+")\n*", 'g')

/**
 * beautify formats the text in srcEditor
 */
function beautify(){
    let srcInput  = srcEditor.doc.getValue();
    let srcNode   = symbParser.parseFromString(srcInput,"image/svg+xml");
    let srcSymbol = srcNode.childNodes[0];
    let i = 0;

    for(; i < srcNode.childNodes.length && srcSymbol.nodeName !== "symbol"; i++){
	srcSymbol = srcNode.childNodes[i];
    }

    if(i === srcNode.childNodes.length) // Silently return without error reporting for now...
	return;

    let pathElem = srcSymbol.childNodes[0];
    for(i=0; i<srcSymbol.childNodes.length && pathElem.nodeName !== "path"; i++)
	pathElem = srcSymbol.childNodes[i];

    if(pathElem.nodeName !== "path") // Again, silently return without error reporting for now ...
	return;

    // Currently, we focus on tracing the first path element in symbol definition only...
    let data = pathElem.getAttribute('d');
    currSrc = data;
    srcLines = currSrc.split(reForSrc);

    let initialSpace = "";
    listSrc = "";
    srcLines.forEach(function(line) {
	listSrc += line +"\n";
    });
    let modifiedSrc = listSrc.replace(/\s\s+/g,"\n ");
    let srcL = modifiedSrc.split(/\n/g);
    let firstLine = srcL[0].replace(/\s*/g, "");
    while(firstLine == "" && srcL.length > 0){
	srcL.splice(0, 1); // remove the first line (which is of \s* type)
	firstLine = srcL[0].replace(/\s*/g, "");
    }
    let finalLine = srcL[srcL.length-1].replace(/\s*/g, "");
    while(finalLine == "" && srcL.length > 0){
	srcL.splice(srcL.length-1); // remove last line from srcL
	finalLine =  srcL[srcL.length-1].replace(/\s*/g, "");
    }
    let srcStyled = "";
    for(let i = 0; i < srcL.length; i++) {
	let currLst  = srcL[i].split(reForSrc);
	let currLine = "\n" + currLst[currLst.length - 1] ;
	srcStyled += currLine;
    }

    pathElem.setAttribute('d', "");
    let existingSrc = pathElem.outerHTML;
    let srcPrettify = existingSrc.replace("d=\"\"", "d= \"" + srcStyled + "\n\"");
    let completeSrc = srcSymbol.outerHTML;
    let symbPretty  = completeSrc.replace(existingSrc, srcPrettify);
    srcEditor.doc.setValue(symbPretty);
    srcEditor.setSize(575, "100%");
    srcEditor.refresh();
    return srcStyled;
}

/** Src related info */
/** srcLines - basic split up of required source */
let srcLines   = [];
let reForLoc   = /([^]*<\s*path\s*d\s*=\s*")([^]*)"/;
let srcLoc     = {}; // object recording src location for first path element (for tracing)
let srcTokenL; // actual split up of text (without parsing into float)
let srcOpL;    // srcOpL[i] - denotes the operation to be performed ...
let srcParamL; // srcParamL[i] - list of parameters extracted for srcLines[i]
let srcSelectL; // info about selection for each parameter in srcLines[i]

/** Variables to map a single line of src code into multiple concrete Operations */
let srcOpIdL  = []; // srcOpIdL[i] - [startIdx, endIdx] - indices into actual, concrete operations
/** Variables below (opL, paramL, ... ) denote actual operations for each step of trace*/
/** opL - actual list of operations for tracing (obtained from srcLines) */
let opL       = [];
/** paramL - corresponding parameters for each of operations in opL */
let paramL    = [];
// Store the coords obtained as a result of each operation as an object
let coordsL   = [];
/** selectL - to obtain the various selections in source code for actual operations (spl. */
let selectL   = [];
// To illustrate information about the movement visually...
let visInfoL  = [];

/** Relevant variables for tracing the current symbol/image*/
let tracerSrc  = ""; // Current source code for processing  (only data attribute of first path element for now ...)
/** tracer variables to keep track of trace state. */
let tracerLst = [];
let opIdx     = -1; // actual lineNo in tracerLst
let tracerSel  = {'line' : 0, 'ch': 0}; // Selection index into tracerSrc (for initial line selection)
/**
 * tracerLst - All info required to trace path in tracerSrc (all computations done and stored here)
 * tracerLst[i] - {'initCoords' : {x,y}, 'finalCoords':{x,y}, 'select': {from, to}, 'srcEnd':number, 'visInfo':value}
 *    where initCoords  - what were the coordinates before execution of current/latest command
 *          finalCoords - final coordinates after executing latest command.
 *          selectFrom  - {line:lineNo, ch:ch}
 *          selectTo    - {line:lineNo, ch:ch}
 *          srcEnd      - idx into tracerSrc (for denoting last execute code)
 *          visInfo     - relevant code to give info regarding latest command executed (see codeDisplay function)
 * P.S:- Actual command, parameters for tracerLst[i] is given by opL[i], paramL[i] respectively.
 */

/**
 * Given fromLoc obtain new location for selection by adding deltaLine, deltaCh.
 *   This should enable a robust selection for next line.
 *   deltaLine - value to add to line idx of fromLoc
 *   deltaCh   - value to be added to fromLoc['ch'] if deltaLine is 0 else it is an absolute char value
 */
function getDestination(fromLoc, deltaLine, deltaCh)
{
    let toLoc = {
	'line' : fromLoc['line'] + deltaLine,
	'ch' : (deltaLine == 0) ? fromLoc['ch'] + deltaCh : deltaCh
    };
    return toLoc;
}

/** currSrc is set to current source value in editor*/
let currSrc = "";
function getFirstPathData()
{
    // Initialization for src level commands
    srcTokenL  = []; // actual split up of text (without parsing into float)
    srcOpL     = []; // srcOpL[i] - indices to denote operations for srcLines[i] ([i1, i2, ... ik] ...).
    srcParamL  = []; // srcParamL[i] - list of parameters extracted for srcLines[i]
    srcSelectL = []; // info about selection for each parameter in srcLines[i]
    // Initialization for concrete operations
    srcOpIdL   = []; // srcOpIdL[srcLineIdx]  = endIdx - index to denote last actual operation in opL for each source line
    opL        = [];
    paramL     = [];
    coordsL    = [];
    selectL    = [];
    visInfoL   = [];

    currSrc = srcEditor.doc.getValue();
    let pathL = currSrc.match(reForLoc);
    preSrc  = pathL[1];
    let fromLoc = {}, toLoc = {};
    let preSrcLines = preSrc.split(/\n/);
    let fromLineIdx = preSrcLines.length - 1;
    let fromCharIdx = preSrcLines[fromLineIdx].length;
    fromLoc['line'] = fromLineIdx;
    fromLoc['ch']   = fromCharIdx;
    tracerSrc   = pathL[2];
    let srcEnd  = currSrc.indexOf(tracerSrc);
    tracerIdx   = currSrc.indexOf(tracerSrc);
    srcLines    = tracerSrc.split(reForSrc);
    let deltaLine = 0; // before start of first operation (delta)
    let deltaChar = 0; // before start of first character (absolute idx)
    if(srcLines[0].replace(/\s*/,"") == "") { // need to compute line delta, char idx for initial empty space segment
	let preLines = srcLines[0].split(/\n/);
	let last = preLines[preLines.length - 1];
	deltaLine = preLines.length - 1;
	deltaChar = last.length;
	srcLines.splice(0, 1); // remove first space segment.
    }
    toLoc  = getDestination(fromLoc, deltaLine, deltaChar);
    srcLoc = {'from' : fromLoc, 'to' : toLoc, 'srcEnd' : srcEnd};
    return tracerSrc;
}

/** Trace the first path element data of current symbol in source code editor*/
function traceSymbol(){
    // TODO: freeze src edit in trace mode.
    /** Get source and save it for future reference (while tracing)*/
    getFirstPathData();
    let currCoords = {'x':0, 'y':0};
    for(let i=0; i < srcLines.length; i++) {
	extractLineTokens(i);
	extractLineSelections(i); // selections at command level (or source lines)
    }
    for(let i=0; i < srcLines.length; i++) {
	genLineCoords(i);
	let currOp = srcOpL[i];
    }
    console.log("Generated details for tracing ...");
}

/**
 * Extract required operations, parameters from source line as tokens (arguments are parsed as float)
 * Input :
 *     srcLineIdx    - lineNo to index in srcLines
 */
// first non-space character of srcLine must be an svg command !
function extractLineTokens(srcLineIdx) {
    // Parsing for the parameters in three steps (or levels)
    // First, get the tokens by using space separators
    //     (all spaces are consumed to generate the first level of tokens) ...
    let srcLine = srcLines[srcLineIdx];
    let srcTokensL1 = srcLine.split(/\s+/g);
    if(srcTokensL1[0].replace(/\s+/, "") == "") {
	srcTokensL1.splice(0, 1); // again, remove the first space segment (for a source line)
    }
    let operation = srcTokensL1[0][0];// First non-space character is an operation
    srcTokensL1[0] = srcTokensL1[0].split(operation)[1];

    // Clean up last space if present ...
    let lastToken = srcTokensL1[srcTokensL1.length - 1];
    let nTokens = srcTokensL1.length;
    while(nTokens > 0 && lastToken.replace(/\s+/,"") == ""){
	srcTokensL1.splice(nTokens - 1);
	lastToken   = srcTokensL1[srcTokensL1.length - 1];
	nTokens     = srcTokensL1.length;
    }

    // Parse for parameters for second Level by splitting for the minus (-) sign
    let srcTokensL2 = [];
    for(let i=0; i < srcTokensL1.length; i++) {
	currTokensLst = srcTokensL1[i].split(/(?=\-)/); // Parse without consuming the minus sign
	srcTokensL2 = srcTokensL2.concat(currTokensLst);
    }

    // Finally, in third pass identify and split up for consecutive decimal points
    // This is a bit involved as many cases involved. For instance, we need to handle 5.75.95.35 as well as .75.96.135 ...
    // Can be handled by split for decimal sign and then checking first two elements (when elements are more than 1)
    // For instance "13.576.575" => 13.576 .575 generating two tokens ...
    let srcTokensL3 = [];
    let paramsLst  = [];
    for(let i=0; i < srcTokensL2.length; i++) {
	currLst = srcTokensL2[i].split(/(?=\.)/); // Parse without consuming the decimal sign
	let firstToken = currLst[0];
	let nextIdx = 1; // index for next token to be added,
	if(currLst.length > 1) {
	    if(currLst[0].split(/\./).length == 1) {// Then, we need to a) modify the first token and b) update nextIdx..
		firstToken = firstToken + currLst[1];
		nextIdx = 2;
	    }
	}
	srcTokensL3.push(firstToken);
	paramsLst.push(parseFloat(firstToken));
	while(nextIdx < currLst.length) {
	    let currToken = currLst[nextIdx];
	    srcTokensL3.push(currToken); // useful for debugging ...
	    paramsLst.push(parseFloat(currToken)); // to enable moving onto the next step of creating trace elements;
	    nextIdx++;
	}
    }

    // TODO: make above three pass a) more intuitive b) more efficient (if needed).
    srcTokenL.push(srcTokensL3);
    srcOpL.push(operation);
    srcParamL.push(paramsLst);
    let srcLineTokens = [operation, paramsLst, srcTokensL3]; // srcLineTokens not used as data saved in global variables above.
    return srcLineTokens;
}

/**
 * Extract Selections for highlighting in the source code.
 */
function extractLineSelections(srcLineIdx)
{
    // Now onto creating required selection elements from current source Line ...
    let from = {}, prevTo = {}, srcEnd = 0;
    if(srcLineIdx == 0) {
	from = srcLoc['to'];
	srcEnd = 0;
    } else {
	prevSelectL = srcSelectL[srcLineIdx - 1];
	lastSelect  = prevSelectL[prevSelectL.length-1]; // end of white space or last parameter
	from = lastSelect['to'];
	srcEnd = lastSelect['srcEnd']; // index of last line in currSrc
    }

    let srcLine = srcLines[srcLineIdx];
    // above, srcLine begins with a single character operation
    srcLine = srcLine.slice(1); // operation removed
    let tokenLst = srcTokenL[srcLineIdx];
    let to  = getDestination(from, 0, 1); // +1 for operation
    srcEnd  = srcEnd+1;
    let currSelectL = [{'from': from, 'to': to, 'srcEnd':srcEnd}];
    let deltaLine = 0, deltaCh = 0;
    for(let i = 0; i < tokenLst.length; i++)
    {
	from = to;
	currParam = tokenLst[i];
	let startIdx = srcLine.indexOf(currParam); // beginning of actual param token
	let preSpace = srcLine.slice(0, startIdx);
	let spaceL   = preSpace.split(/\n/);
	let lastSp   = spaceL[spaceL.length - 1];
	deltaLine = spaceL.length - 1; // to add number of lines
	deltaCh   = lastSp.length + currParam.length; // add info from currParam to select till the end
	srcEnd    = srcEnd + preSpace.length + currParam.length;  // to index into tracerSrc
	to = getDestination(from, deltaLine, deltaCh);
	currSelectL.push({'from':from, 'to':to, 'srcEnd' : srcEnd});
	srcLine = srcLine.slice(preSpace.length + currParam.length);
    }

    // Info for last select which covers all trailing spaces till next command ...
    deltaLine = 0, deltaCh = 0;
    if(srcLine != "") {
	from = to;
	let preSpace = srcLine; // now srcLine should consist only of spaces ...
	let spaceL   = preSpace.split(/\n/);
	let lastSp   = spaceL[spaceL.length - 1];
	deltaLine = spaceL.length - 1; // to add number of lines
	deltaCh   = lastSp.length; // add last line space info for charIdx
	srcEnd    = srcEnd + preSpace.length;
    }
    // Get last line with trailing spaces...
    to = getDestination(from, deltaLine, deltaCh);
    currSelectL.push({'from':from, 'to':to, 'srcEnd': srcEnd});
    srcSelectL.push(currSelectL);
    return srcSelectL;
}

/** set Selection from selectL -- for debugging purposes mainly*/
function setSelection(selectLst, i, j)
{
    if(selectLst[i] == undefined || selectLst[i][j] == undefined) {
	console.log('selectLst not defined for ('+i+',' + 'j).');
	return;
    }
    let from = selectLst[i][j]['from'];
    let to   = selectLst[i][j]['to'];
    srcEditor.doc.setSelection(from, to);
}

// initPath coordinates for tracking when a path is created ...
let initPathX = 0;
let initPathY = 0;
/**
 * Obtain concrete operations for the source line given by srcLineIdx and save into global variables
 *     opL      - operation to be applied (the first command in the source line)
 *     paramL   - parameters corresponding to a concrete application of srcLineIdx (extracted from srcParamsL[srcLineIdx])
 *     coordsL  - result of coordinates
 *     selectL  - selections for each operation for sourceLine (using srcSelectL)
 *     srcOpIdL - to save index of last operation generated for srcLineIdx (after extracting *all* operations for src Line).
 */
function genLineCoords(srcLineIdx){
    // first, set currCoords appropriately
    let currCoords = {'x' : 0, 'y':0};
    // id of previous Operation
    let prevIdx    = 0;
    if(srcLineIdx > 0) {
	prevIdx     = coordsL.length - 1;
	currCoords  = coordsL[prevIdx];
    }
    // Now, define currX, currY for convenience
    let currX      = currCoords['x'];
    let currY      = currCoords['y'];

    // start of with operation/command for current source line ...
    let operation = srcOpL[srcLineIdx];
    // get the source line that needs to be split up into operations ...
    let srcLine = srcLines[srcLineIdx];
    let params  = srcParamL[srcLineIdx];
    let paramId = 0; // current index to denote next parameter to process ...
    let select  = srcSelectL[srcLineIdx];

    // Definitions : https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
    // First, process operations that have no parameters
    if(operation.match(/z/i)) {// closepath ... currParams = [] in this case
	currCoords = {'x':initPathX, 'y':initPathY}; // return global initX, initY values
	// Add in the concrete operation for closepath
	opL.push(operation);
	coordsL.push(currCoords);
	paramL.push([]);
	selectL.push([]);
    }

    // Next, process operations that consume a constant number of parameters (alongwith implicit operations),
    // An example for implicit operations is the move operation
    // See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#moveto_path_commands
    if(operation.match(/m|M/)){
	if(params.length < 2) {
	    alert("Operation "+ operation + " must have at least two parameters");
	    return null; // return null object to denote error (for error handling)
	}
	currCoords = {'x':params[0], 'y':params[1]};
	let moveOp = operation; // save current operation before modification (for implicit to explicit conversion)
	// implicit conversion to L operation
	operation = "L";
	if(operation == "m") {
	    currCoords['x'] += currX;
	    currCoords['y'] += currY;
	    // implicit conversion to l operation
	    operation = "l";
	}
	initPathX = currCoords['x'];
	initPathY = currCoords['y'];
	// Now, to add in a concrete operation alongwith additional data
	opL.push(moveOp); // moveOp denotes original operation
	paramL.push(params.slice(0, 2));  // slice is non-destructive
	selectL.push(select.slice(0, 2)); // similar to params selection
	coordsL.push(currCoords);
	// Set paramId to denote consumption of first two parameters
	paramId = 2;
    }

    // In Ideal scenario params will be completely consumed to create the operations
    //   If there are extra params, ignore
    //     but, when less than required to complete an operation, alert and return.
    let nParams = 0;
    let delta = 0, dx = 0, dy = 0;
    while(paramId < params.length) {
	nParams = 0;
	currX = currCoords['x'], currY = currCoords['y'];
	delta = params[paramId];

	// Process for each type of operation one by one ...
	if(operation.match(/h|v/i)){ // ignore case ...
	    nParams = 1;
	    if(delta == undefined) {
		alert('Insufficient parameters for '+operation+' !');
		return null;
	    }
	    if(operation == "h")
		currCoords = {'x':(currX + delta), 'y':currY};
	    if(operation == "H")
		currCoords = {'x':delta, 'y':currY};
	    if(operation == "v")
		currCoords = {'x':currX, 'y':(currY + delta)};
	    if(operation == "V")
		currCoords = {'x':currX, 'y':delta};
	}
	else if(operation.match(/l|L/)){
	    nParams = 2;
	    dx = params[paramId], dy = params[paramId + 1];
	}
	else if(operation.match(/q|Q/)){
	    nParams = 4; // first 2 for control point, following two for destination / delta
	    dx = params[paramId + 2], dy = params[paramId + 3];
	}
	// Smooth Quadratic Bezier Curve
	else if(operation.match(/t|T/)){
	    nParams = 2; // implicit control point, following two for destination / delta
	    dx = params[paramId], dy = params[paramId + 1];
	}
	else if(operation.match(/c|C/)){
	    nParams = 6; // first 4 for control points, following two for destination / delta
	    dx = params[paramId + 4], dy = params[paramId + 5];
	}
	// Smooth Cubic Bezier Curves
	// similar to cubic command except for the implicit starting control point (for computing next coordinate)
	// See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
	else if(operation.match(/s|S/)){
	    nParams = 4;
	    dx = params[paramId + 2], dy = params[paramId + 3];
	}
	else {
	    console.log('undefined operation : '+operation+' !');
	    nParams = params.length; // to terminate the loop and move on to the next source line ...
	}

	// Set currCoords appropiately after checking for sufficient parameters...
	if(operation.match(/l|q|t|c|s/i) != null) {
	    if(dx == undefined || dy == undefined) {
		alert('Insufficient parameters for '+operation+' !');
		return null; // to denote error in processing
	    }
	    // On to processing for currCoords
	    currCoords = {'x' : dx, 'y': dy};
	    // Add previous coordinates (in currX, currY) if required
	    if(operation.toLowerCase() == operation) {
		currCoords['x'] += currX;
		currCoords['y'] += currY;
	    }
	}

	// Now, to add in a concrete operation alongwith additional data
	opL.push(operation);
	coordsL.push(currCoords);
	paramL.push(params.slice(paramId, paramId + nParams)); // slice is non-destructive
	selectL.push(select.slice(paramId, paramId + nParams)); // similar to params selection
	paramId = paramId + nParams; // finally, update paramId
    }

    // Update operations Index for last operation corresponding to srcLineIdx
    srcOpIdL.push(opL.length-1);

    // currCoords (non-null) returned to denote successful generation of operations for srcLineIdx
    return currCoords;
}

/*
 * Visually draw the required sketches to better follow current operation with parameters
 */
function getInfoFor(operation, params, prevCoords, nextCoords){
    let cmds = "";
    let prevX = prevCoords['x'];
    let prevY = prevCoords['y'];
    let nextX = nextCoords['x'];
    let nextY = nextCoords['y'];

    if(operation.match(/z/i)) {// closepath ...
	cmds += "<circle cx=\""+prevX+"\" cy=\""+prevY+"\" r=\"5\" fill=\"red\"/>\n";
	cmds += "<line style =\"stroke:rgb(155, 155, 155); stroke-width: 2;\" ";
	cmds += "stroke-dasharray=\"5, 5\" x1=\""+prevX+"\" y1=\""+prevY+"\" x2=\""+nextX+"\" y2=\""+nextY+"\"></line>\n";
	cmds += "<circle cx=\""+nextX+"\" cy=\""+nextY+"\" r=\"5\" fill=\"green\"/>\n";
    }
    if(operation.match(/z|m|l/i)) { // for closepath, move, line show previous, next coords
	cmds += "<circle cx=\""+prevX+"\" cy=\""+prevY+"\" r=\"5\" fill=\"red\"/>\n";
	cmds += "<circle cx=\""+nextX+"\" cy=\""+nextY+"\" r=\"5\" fill=\"green\"/>\n";
	if(operation.match(/l/i)) {
	    // No need to draw any line ...
	} else {
	    cmds += "<line style =\"stroke:rgb(155, 155, 155); stroke-width: 2;\" " ;
	    cmds += "stroke-dasharray=\"5, 5\" x1=\""+prevX+"\" y1=\""+prevY+"\" x2=\""+nextX+"\" y2=\""+nextY+"\"></line>\n";
	}
    }
    if(operation.match(/h|v/i)){
	cmds += "<circle cx=\""+prevX+"\" cy=\""+prevY+"\" r=\"5\" fill=\"red\"/>\n";
	cmds += "<circle cx=\""+nextX+"\" cy=\""+nextY+"\" r=\"5\" fill=\"green\"/>\n";
	cmds += "stroke-dasharray=\"5, 5\" x1=\""+prevX+"\" y1=\""+prevY+"\" x2=\""+nextX+"\" y2=\""+nextY+"\"></line>\n";
    }
    if(operation.match(/c/i)) { // for cubic curve, show previous, next points, with control points (in gray)
	let point1X = params[0], point1Y = params[1];
	let point2X = params[2], point2Y = params[3];
	if(operation === "c") {
	    point1X += prevCoords['x']; point1Y += prevCoords['y'];
	    point2X += prevCoords['x']; point2Y += prevCoords['y'];
	}
	cmds += "<circle cx=\""+prevX+"\" cy=\""+prevY+"\" r=\"5\" fill=\"red\"/>\n";
	cmds += "<circle cx=\"" +point1X+ "\" cy=\"" +point1Y+ "\" r=\"5\" fill=\"gray\"/>\n";
	cmds += "<line style =\"stroke:rgb(155, 155, 155); stroke-width: 2;\" ";
	cmds += "stroke-dasharray=\"5, 5\" x1=\""+prevX+"\" y1=\""+prevY+"\" x2=\""+point1X+"\" y2=\""+point1Y+"\"></line>\n";
	cmds += "<circle cx=\"" +point2X+ "\" cy=\"" +point2Y+ "\" r=\"5\" fill=\"gray\"/>\n";
	cmds += "<circle cx=\""+nextX+"\" cy=\""+nextY+"\" r=\"5\" fill=\"green\"/>\n";
	cmds += "<line style =\"stroke:rgb(155, 155, 155); stroke-width: 2;\" ";
	cmds += "stroke-dasharray=\"5, 5\" x1=\""+point2X+"\" y1=\""+point2Y+"\" x2=\""+nextX+"\" y2=\""+nextY+"\"></line>\n";
    }
    return cmds;
}

/**
 * Obtain trace Elements for command operation applied with paramsLst ...
 */
// Recalling tracerLst info described earlier ...
/**
 * tracerLst - All info required to trace path in tracerSrc (all computations done and stored here)
 * tracerLst[i] - {'initCoords' : {x:xVal, y:yVal}, 'finalCoords':{x:xVal, y:yVal}, 'select': {from, to}, 'srcEnd':number, 'visInfo':value}
 *    where initCoords  - what were the coordinates before execution of current/latest command
 *          finalCoords - final coordinates after executing latest command.
 *          selectFrom  - {line:lineNo, ch:ch}
 *          selectTo    - {line:lineNo, ch:ch}
 *          srcEnd     - idx into tracerSrc (for denoting last execute code)
 *          visInfo     - relevant code to give info regarding latest command executed (see codeDisplay function)
 * P.S:- Actual command, parameters for tracerLst[i] is given by opL[i], paramL[i] respectively.
 */
// srcResult['finalCoords'] = currCoords;
// srcResult['operations']  = ops;
// selectionLst[i] - {line:lineNo, ch: chNo} for each value paramsLst[i].
function generateTraceElements(initCoords, operationSel, selectionLst, operation, paramsLst){
    let tracerElem = {};
    let prevCoords = initCoords;
    let currCoords = {};
    let operations = [];
    let remainingParams = paramsLst;
    let remainingSelLst = selectionLst;
    if(paramsLst.length == 0) { // zero param command (closepath , 'z' command)
	coordsObject = getNextCoords(prevCoords, operationSel, remainingSelLst, operation,  remainingParams);
	currCoords   = coordsObject['finalCoords'];
	tracerElem['initCoords']  = prevCoords;
	tracerElem['finalCoords'] = coordsObject['finalCoords'];
	tracerElem['selectFrom']  = operationSel['from']; // Always select from current operation (to reduce complexity for now ...)
	// selectTo, srcEnd depends on the final parameter selected in getting next coordinate
	tracerElem['selectTo']    = coordsObject['selectTo'];
	tracerElem['srcEnd']      = coordsObject['srcEnd'];
	tracerElem['visInfo']     = getInfoFor(operation, remainingParams, prevCoords, currCoords);
	remainingParams = coordsObject['remainingParams'];
	remainingSelLst = coordsObject['remainingSelLst'];
	prevCoords = currCoords;
	tracerLst.push(tracerElem);
	operations.push(opL.length);
	opL.push(operation);
	paramL.push(coordsObject['selectedParams']);
    }

    while(remainingParams.length > 0) { // for other commands
	tracerElem = {}; // construct tracerElem object each time;
	// All the work for actually computing the required coordinates, obtaining selection defered to getNextCoords ...
	coordsObject = getNextCoords(prevCoords, operationSel, remainingSelLst, operation,  remainingParams);
	currCoords   = coordsObject['finalCoords'];
	tracerElem['initCoords']  = prevCoords;
	tracerElem['finalCoords'] = coordsObject['finalCoords'];
	tracerElem['selectFrom']  = operationSel['from']; // Always select from current operation (to reduce complexity for now ...)
	// selectTo, srcEnd depends on the final parameter selected in getting next coordinate
	tracerElem['selectTo']    = coordsObject['selectTo'];
	tracerElem['srcEnd']      = coordsObject['srcEnd'];
	tracerElem['visInfo']     = getInfoFor(operation, remainingParams, prevCoords, currCoords);
	remainingParams = coordsObject['remainingParams'];
	remainingSelLst = coordsObject['remainingSelLst'];
	prevCoords = currCoords;
	tracerLst.push(tracerElem);
	operations.push(opL.length);
	opL.push(operation);
	paramL.push(coordsObject['selectedParams']);
    }
    srcResult = tracerElem;
    srcResult['operations'] = operations;
    return srcResult;
}

function getTracerButtonSrc(fName, value){
    let trBody = "&nbsp;<button class=\"buttonTracer\" onclick=\""+fName+"()\">"+value+"</button>&nbsp;"
    return trBody;
}

function getTracerDetails(idx) {
    currTrace = tracerLst[idx];
    let from = currTrace['selectFrom'];
    let to   = currTrace['selectTo'];
    let endIdx = currTrace['srcEnd'];
    let srcCode = tracerSrc.slice(0, endIdx);
    let visInfo = currTrace['visInfo'];
    if(idx<0) {
	executedCode = "";
    }
    let targetCode = "<path d=\"" + srcCode + "\"></path>" + visInfo;
    console.log(srcCode);
    console.log(executedCode);
    console.log(targetCode);
}

function codeDisplay(idx){
    if(idx >= tracerLst.length) {
	idx = tracerLst.length-1;
    }
    currTrace = tracerLst[idx];
    let from = currTrace['selectFrom'];
    let to   = currTrace['selectTo'];
    // TODO: how to show latest command related content  differently? Need to figure it out ...
    srcEditor.doc.setSelection(from, to);
    let endIdx = currTrace['srcEnd'];
    let srcCode = tracerSrc.slice(0, endIdx);
    let visInfo = currTrace['visInfo'];
    if(idx<0) {
	executedCode = "";
    }
    let targetCode = "<path d=\"" + srcCode + "\"></path>" + visInfo;
    let targetElem = document.getElementById('bViews-symbolDisplayed');
    targetElem.innerHTML = targetCode;
}

function tracerPrev(){
    opIdx--;
    if(opIdx<0) {
	opIdx = -1;
	alert('Beginning of Trace Src code reached !!!');
    }
    codeDisplay(opIdx);
}

function tracerPause(){
    alert("TODO :\na)automatically play with some delay (as a slideshow)\nb) On click, pause");
}

function tracerNext(){
    opIdx++;
    if(opIdx > tracerLst.length){
	opIdx = tracerLst.length;
    }
    codeDisplay(opIdx);
}

function traceSettings(){
}

// For convenience for switching to trace without having to click and choose etc.,
function traceMode(){
    // First, select all source symbols available (that have been loaded in window)...
    selectAllSymbols();
    ikonizer();
    //iconListVisibility();
    getNextSymbol();
    traceSymbol();
    let srcElem = document.getElementById('srcArea');
    srcElem.parentElement.style.width="30%";
}
