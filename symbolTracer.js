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

const symbParser = new DOMParser();
const moveTo = ['M', 'm'];
const line = ['L', 'l', 'H', 'h', 'V', 'v'];
const cubic = ['C','c','S','s'];
const quad = ['Q','q','T','t'];
const ellArc = ['A', 'a'];
const closeP = ['Z', 'z'];
const commands = [...moveTo, ...line, ...cubic, ...quad, ...ellArc, ...closeP];

let commandSeq = "";
let commandSeqIdL=[];
let lineNo = -1;
let commandL = [];
let opL = [];
let paramL = [];
// To illustrate information about the movement visually...
let infoL = [];
// initial coordinates before the current operation...
// Should be updated after each operation...
let initX=0, initY = 0;
// Store the coords obtained as a result of each operation as an object
let coordsL = [];

function traceSymbol(){
    // First, reset commandSeq, commandSeqIdL, lineNo
    commandSeq = "";
    commandSeqIdL = [];
    lineNo = -1;
    commandL = [];
    opL = [];
    paramL = [];
    coordsL = [];
    infoL = [];

    let srcElem = document.getElementById('srcArea');
    let srcNode = symbParser.parseFromString(srcElem.innerText,"image/svg+xml");
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
    let inputL = data.split(" ");
    /*
     * First objective is to get a canonical representation for data as a list of commands (with parameters)
     */
    let re = commands.reduce( (expr, cmd) => expr === "" ? cmd : expr + "|" + cmd, "");
    let commandExpr = new RegExp(re, 'g');
    let currIdx = data.search(commandExpr);
    let offset = data.slice(currIdx+1).search(commandExpr);
    let prevCoords = {'x' : 0, 'y' : 0};
    let params = "";
    let nextCoords = {'x' : 0, 'y': 0};
    while(offset >= 0){
	offset = data.slice(currIdx+1).search(commandExpr);
	let nextIdx = (currIdx + 1) + offset;
	let operation = data.slice(currIdx, currIdx+1);
	opL.push(operation);
	if(offset >= 0)
	    params = data.slice(currIdx+1, nextIdx);
	else
	    params = data.slice(currIdx+1);
	if(operation === 'Z' || operation === 'z')
	    paramsSplit = [];
	else // https://stackoverflow.com/a/12721958/10645311 ... TODO: figure out how match+global works
	    paramsSplit = params.match(/^\d*(\.\d+)?|[-,\s]\s*\d*(\.\d+)?/g);
	paramsVal = paramsSplit.map(val=>parseFloat(val));
	paramL.push(paramsVal);
	let currCmd = operation + paramsVal.reduce((acc,elem)=>(acc+" "+elem), "");
	commandL.push(currCmd);
	commandSeq = commandSeq + currCmd + "\n";
	commandSeqIdL.push(commandSeq.length);
	nextCoords = getNextCoords(prevCoords, operation, paramsVal);
	coordsL.push(nextCoords);
	let info = getInfoFor(operation, paramsVal, prevCoords, nextCoords);
	infoL.push(info);
	currIdx = nextIdx;
	prevCoords['x'] = nextCoords['x'];
	prevCoords['y'] = nextCoords['y'];
    }
    commandL.push(data.slice(currIdx, currIdx+1));

    codeDisplay(lineNo);
    let targetArea = document.getElementById('targetArea');
    ["tracerPrev", "tracerPlay", "tracerNext"].forEach(function(buttonID){
	let elem = document.getElementById(buttonID);
	elem.style.backgroundColor = "#5555AA";
    });
 }

function getNextCoords(prevCoords, operation, params){
    prevX = prevCoords['x'];
    prevY = prevCoords['y'];
    if(operation.match(/z/i)) // closepath ... return current coordinates for now (needs to be corrected)
	return {'x':initX, 'y':initY}; // return global initX, initY values
    if(operation.match(/M|L/)){
	if(operation == "M") {
	    initX = params[0];
	    initY = params[1];
	}
	return {'x':params[0], 'y':params[1]};
    }
    if(operation.match(/m|l/)){
	if(operation == "m") {
	    initX = prevX + params[0];
	    initY = prevY + params[1];
	}
	return {'x':(prevX + params[0]), 'y':(prevY + params[1])};
    }
    if(operation.match(/h|v/i)){
	if(operation == "h")
	    return {'x':(prevX + params[0]), 'y':(prevY)};
	if(operation == "H")
	    return {'x':(params[0]), 'y':(prevY)};
	if(operation == "v")
	    return {'x':(prevX), 'y':(prevY + params[0])};
	if(operation == "V")
	    return {'x':(params[0]), 'y':(params[0])};
    }
    if(operation.match(/c|C/)){
	if(operation == "c")
	    return {'x' : (prevX + params[4]), 'y':(prevY + params[5])};
	// else operation == "C"
	return {'x' : (params[4]), 'y':(params[5])};
    }

    return {'x':prevCoords['x'], 'y':prevCoords['y']};
}

/*
  Visually draw the required sketches to better follow current operation with parameters
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
	if(!operation.match(/l/i))
	    cmds += ("<line style =\"stroke:rgb(155, 155, 155); stroke-width: 2;\" " +
		     "stroke-dasharray=\"5, 5\" x1=\""+prevX+"\" y1=\""+prevY+"\" x2=\""+nextX+"\" y2=\""+nextY+"\"></line>\n");
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
    if(operation.match(/z/i)) {
	
    }
    return cmds;
}

function getTracerButtonSrc(fName, value){
    let trBody = "&nbsp;<button class=\"buttonTracer\" onclick=\""+fName+"()\">"+value+"</button>&nbsp;"
    return trBody;
}

function codeDisplay(idx){
    let srcElem = document.getElementById('srcArea');
    srcElem.contentEditable = false;
    if(idx >= commandSeqIdL.length)
	idx = commandSeqIdL.length-1;
    let executedCode = getExecutedCode(commandSeq, commandSeqIdL, idx);
    executedCode = executedCode.trim();
    let toExecute = getCodeToExecute(commandSeq, commandSeqIdL, idx);
    if(idx<0) {
	executedCode = "";
	toExecute = commandSeq;
    }
    srcElem.innerHTML = "<pre class=\"executed\">" + executedCode + "</pre>";
    srcElem.innerHTML += "<pre class=\"toExec\">" + toExecute + "</pre>";
    // Having set the source code for display, we now set what is to be shown ...
    let targetCode = "<path d=\"" + executedCode + "\"></path>" + infoL[idx];
    let targetElem = document.getElementById('bViews-symbolDisplayed');
    targetElem.innerHTML = targetCode;
}

function getExecutedCode(commandSeq, idL, idx){
    return commandSeq.slice(0, idL[idx]);
}

function getCodeToExecute(commandSeq, idL, idx){
    return commandSeq.slice(idL[idx]);
}

function traceSettings(){
}

function tracerPrev(){
    lineNo--;
    if(lineNo<0)
	lineNo = -1;
    codeDisplay(lineNo);
}

function tracerPause(){
    alert("TODO :\na)automatically play with some delay (as a slideshow)\nb) On click, pause");
}

function tracerNext(){
    lineNo++;
    codeDisplay(lineNo);
}

// For convenience for switching to trace without having to click and choose etc.,
function traceMode(){
    // First, select all source symbols available (that have been loaded in window)...
    selectAllSymbols();
    ikonizer();
    iconListVisibility();
    getNextSymbol();
    traceSymbol();
    let srcElem = document.getElementById('srcArea');
    srcElem.parentElement.style.width="30%";
}
