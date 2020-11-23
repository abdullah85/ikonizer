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

function traceSymbol(){
    // First, reset commandSeq, commandSeqIdL, lineNo
    commandSeq = "";
    commandSeqIdL = [];
    lineNo = -1;
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
    let commandL = [];
    let opL = [];
    let paramL = [];
    let re = commands.reduce( (expr, cmd) => expr === "" ? cmd : expr+"|" + cmd, "");
    let commandExpr = new RegExp(re, 'g');
    let currIdx = data.search(commandExpr);
    let offset = data.slice(currIdx+1).search(commandExpr);
    let params = "";
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
	    paramsSplit = params.match(/^\d+|[-\s]\d+(\.\d+)?/g);
	paramsVal = paramsSplit.map(val=>parseFloat(val));
	paramL.push(paramsVal);
	let currCmd = operation + paramsVal.reduce((acc,elem)=>(acc+" "+elem), "");
	commandL.push(currCmd);
	commandSeq = commandSeq + currCmd + "\n";
	commandSeqIdL.push(commandSeq.length);
	currIdx = nextIdx;
    }
    commandL.push(data.slice(currIdx, currIdx+1));

    codeDisplay(lineNo);
    let targetArea = document.getElementById('targetArea');
    let trHdr = "<div style=\"display: block\">&nbsp;&nbsp;";
    let trFtr = "</div>";
    let trBody = getTracerButtonSrc("tracerPrev","<<");
    trBody += getTracerButtonSrc("tracerPause","||");
    trBody += getTracerButtonSrc("tracerNext",">>");
    targetArea.innerHTML += "<div class=\"break\"></div>"+ trHdr + trBody + trFtr;
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
    let toExecute = getCodeToExecute(commandSeq, commandSeqIdL, idx);
    if(idx<0) {
	executedCode = "";
	toExecute = commandSeq;
    }
    srcElem.innerHTML = "<pre class=\"executed\">" + executedCode + "</pre>";
    srcElem.innerHTML += "<pre class=\"toExec\">" + toExecute + "</pre>";
    let targetElem = document.getElementById('bViews-symbolDisplayed');
    targetElem.innerHTML = "<path d=\"" + executedCode + "\"></path>";
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
