"use strict";

const CanvasID = 'infinite-code-scroll';
const ContainerID = 'code-scroll-container';

// vs code color scheme 
var colors = {
  lightBlue : '#9cdcfeff',
  darkBlue : '#569cd6ff',
  yellow : '#dcdcaaff',
  darkGreen : '#6a9955ff',
  white : '#d4d4d4ff',
  lightGreen : '#b5cea8ff',
  classGreen : '#4ec9b0ff',
  orange : '#ce9178ff',
  purple : '#c586c0ff',
  black : '#1e1e1eff'
}

var colorScheme = {
  comment: colors.darkGreen,
  identifier: colors.lightBlue,
  number: colors.lightGreen,
  primitives: [
    colors.lightGreen,  //number
    colors.orange,      //string
    colors.yellow       //function
  ],
  type: colors.darkBlue,
  function: colors.yellow,
  class: colors.classGreen,
  keyword: colors.purple,
  operator: colors.white,
  background: colors.black
}

// setup variables
const canvas = document.getElementById(CanvasID);
var ctx = canvas.getContext('2d');
var container = document.getElementById(ContainerID);
const LinesPerScreen = 80;
var Speed = 0.1;
const TabSpace = 4;

//declare global variables
var charHeight, lineGap, toRender, cursorX, cursorY, charWidth, tab, lastLine, baseX, pixelPerMove, functionLevel, indentLevel, blocksSinceLastClose, lines, blockCloseFunctions, blocksSinceLevelOne, lastUpdateCanvas;

var currentLineId = 0;
var oneToFive = [];
var oneToFiveIndex = 0;
var oneToTen = [3];  //give a initial value to avoid 
var oneToTenIndex = 0;
var oneToThree = [];
var oneToThreeIndex = 0;
var bool = [];
var boolIndex = 0;

// these variables needs to be re-initialzed when canvas update
function initGlobalFlags () {
  functionLevel = 0;
  indentLevel = 0;
  lines = [];
  blockCloseFunctions = [];
  blocksSinceLastClose = 0;
  blocksSinceLevelOne = -1; // -1 means current level = 0
}

function initScaleVariables () {
  charHeight = Math.ceil((window.innerWidth / LinesPerScreen) * 0.6);
  lineGap = Math.ceil(charHeight * 0.8);
  charWidth = Math.ceil(charHeight * 0.5);
  pixelPerMove = Math.ceil(charHeight * Speed); 
  baseX = charWidth * TabSpace;
  cursorX = baseX;
  cursorY = 0;
  tab = charWidth * TabSpace;
}

function updateCanvas() {
  //thorttle function calls
  if ((new Date).getTime()-lastUpdateCanvas < 300) return;
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.fillStyle = colorScheme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr);
  initGlobalFlags();
  initScaleVariables();
  lastUpdateCanvas = (new Date).getTime();
}



// ========= random number functions ==============
// pre-generate random numbers for better performance
async function generateRandomNumbers () {
  for (let i = 0; i < 50000; i++) {
    let s = Math.random().toString().substring(2);
    for (let char of s) {
      let i = parseInt(char);
      if (i <= 2) {
        oneToThree.push(i+1);
      }
      if (i <= 4) {
        oneToFive.push(i+1);
        bool.push(1);
      } else {
        bool.push(0);
      }
      if (i != oneToTen[oneToTen.length - 1]) {
        oneToTen.push(i+1);   //oneToTen is non consecutive
      }
    }
  }
}
function getNumberOneToFive () {
  if (oneToFiveIndex >= oneToFive.length) {
    oneToFiveIndex = 0;
  } else {
    oneToFiveIndex++;
  }
  return oneToFive[oneToFiveIndex];
}
function getNumberOneToTen () {
  if (oneToTenIndex >= oneToTen.length) {
    oneToTenIndex = 0;
  } else {
    oneToTenIndex++;
  }
  return oneToTen[oneToTenIndex];
}
function getNumberOneToThree () {
  if (oneToThreeIndex >= oneToThree.length) {
    oneToThreeIndex = 0;
  } else {
    oneToThreeIndex++;
  }
  return oneToThree[oneToThreeIndex];
}
function getBool () {
  if (boolIndex >= oneToThree.length) {
    boolIndex = 0;
  } else {
    boolIndex++;
  }
  return bool[boolIndex];
}

//gets a unique new line ID
function getNewLineId () {
  if (currentLineId >= 10000) {
    currentLineId = 0;
  } else {
    currentLineId++;
  }
  return currentLineId;
}


// ================ all sorts of lines=================
/**
 *  segments will be like:
 * [
 *    {
 *      chars: 4,
 *      color: 'blue'
 *    },
 *    {
 *      ...
 *    },
 *    ...
 *  ]
 * */ 
class Line {
  constructor (x, y) {
    if (!x && x!==0) x = cursorX;
    if (!y && y!==0) y = cursorY;
    this.x = x;
    this.y = y;
    this.segments = [];
    this.id = getNewLineId();
    this.moveCursorDown();
  }

  // move the cursor posistion to below this line
  moveCursorDown() {
    cursorX = this.x;
    cursorY = this.y + lineGap + charHeight;
  }

  /**
   * draws the line, move up
   */
  updateDraw() {  //TODO: make this more efficient
    //move line up
    this.y -= pixelPerMove;
    //only draw if enter canvas
    if (this.y <= canvas.height) {
      if (this.y < 0 - charHeight - lineGap) {
        //this line is done. delete it
        return false;
      }
      let cursor = this.x;
      for (let segment of this.segments) {
        ctx.fillStyle = segment.color;
        ctx.fillRect(cursor, this.y, segment.chars * charWidth, charHeight);
        cursor+=segment.chars*charWidth;
        //space after segment
        ctx.fillStyle=colorScheme.background;
        ctx.fillRect(cursor, this.y, charWidth, charHeight);
        cursor+= charWidth;
      }
      //fill all after with black
      let spaceLeft = canvas.width - cursor; 
      ctx.fillStyle=colorScheme.background;
      if (spaceLeft > 0) {
        ctx.fillRect(cursor, this.y, spaceLeft, charHeight);
      }
      // fill line gap
      ctx.fillRect(0, this.y+charHeight, canvas.width, lineGap);
    }
    // update cursor position if this is the newest line 
    if (this.id === currentLineId) {
      this.moveCursorDown();
    }
    return true;
  }
}

class CommentLine extends Line {
  constructor (x, y) {
    super (x, y);
    this.segments.push({
      chars: (getNumberOneToTen() + getNumberOneToFive())* 3 + 10,
      color: colorScheme.comment
    });
  }
}

class AssignmentLine extends Line {
  constructor (x, y) {
    super (x, y);
    this.segments = [
      {
        chars: getNumberOneToFive() + 2,
        color: colorScheme.type
      },
      {
        chars: getNumberOneToFive() + 5,
        color: colorScheme.identifier
      },
      {
        chars: getNumberOneToTen() + 3,
        color: colorScheme.primitives[getNumberOneToThree() - 1]
      }
    ]
  }
}

class MutationLine extends Line {
  constructor (x, y) {
    super (x, y);
    this.segments = [
      //identifier
      {
        chars: getNumberOneToFive() + 5,
        color: colorScheme.identifier
      }
    ];
    let colorsToChoose = colorScheme.primitives.concat(colorScheme.identifier);
    let rollDice = getNumberOneToFive() - 1;
    if (rollDice === 4) {
      // equals class
      this.segments.push(
        {
          chars: 3,
          color: colorScheme.keyword
        },
        {
          chars: getNumberOneToFive() * 2 + 5,
          color: colorScheme.class
        }
      )
    } else {
      // equals value
      this.segments.push({
        chars: getNumberOneToTen() + 3,
        color: colorsToChoose[rollDice]
      })
    }
  }
}

class CallFunctionLine extends Line {
  constructor (x,y) {
    super(x, y);
    this.segments = [
      {
        chars: getNumberOneToFive() + 4,
        color: colorScheme.function
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    ];
    if (getBool()) {
      this.segments.push (
        {
          chars: getNumberOneToFive() + 4,
          color: colorScheme.identifier
        },
        {
          chars: 1,
          color: colorScheme.operator
        }
      )
    }
  }
}

class FlowControlLine extends Line {
  constructor (x, y) {
    super (x, y);
    this.segments.push({
      chars: 8,
      color: colorScheme.keyword
    });
  }
}

class OpenLine extends Line {
  constructor (x, y) {
    super(x, y);
  }
  moveCursorDown() {
    cursorX = this.x + tab;
    cursorY = this.y + lineGap + charHeight;
  }
}
class FunctionOpenLine extends OpenLine {
  constructor (x, y) {
    super(x, y);
    this.segments = [
      {
        chars: 7,
        color: colorScheme.type
      },
      {
        chars: getNumberOneToTen() + 5,
        color: colorScheme.function
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    ];
  }
}

class BlockOpenLine extends OpenLine {
  constructor (x, y) {
    super(x, y);
    this.segments = [
      {
        chars: getNumberOneToThree() + 2,
        color: colorScheme.keyword
      },
      {
        chars: getNumberOneToTen() + getNumberOneToFive() + 3,
        color: colorScheme.identifier
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    ];
  }
}

class ClassOpenLine extends OpenLine {
  constructor (x, y) {
    super(x, y);
    this.segments = [
      {
        chars: getNumberOneToFive() + 2,
        color: colorScheme.class
      },
      {
        chars: getNumberOneToTen() + 3,
        color: colorScheme.identifier
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    ];
  }
}

class ForLoopOpenLine extends OpenLine {
  constructor (x, y) {
    super(x, y);
    let iterator = {             
      chars: getNumberOneToFive() + 3,
      color: colorScheme.identifier
    }
    let singleOp = {
      chars: 1,   
      color: colorScheme.operator
    }
    
    this.segments = [
      {
        chars: 3,  //for
        color: colorScheme.keyword
      },
      {
        chars: 3,   //var 
        color: colorScheme.type
      },
      iterator,     //xxx
      iterator,     //xxx
      {
        chars: getNumberOneToFive() + 3,   // < y
        color: colorScheme.number
      },
      iterator,
      singleOp
    ];
  }
}
class BlockCloseLine extends Line {
  constructor (x, y) {
    super(x, y)
    if (x < baseX) return;  // already base level
    this.x -= tab;
    this.segments = [{
      chars: 1,
      color: colorScheme.operator
    }]
    this.moveCursorDown();
  }
}

class ElseIfLine extends BlockCloseLine {
  constructor (x, y) {
    super(x, y);
    this.segments.push (
      {
        chars: 4,
        color: colorScheme.keyword
      },
      {
        chars: 2,
        color: colorScheme.keyword
      },
      {
        chars: getNumberOneToTen() + getNumberOneToFive() + 3,
        color: getBool()? colorScheme.identifier: colorScheme.function
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    );
    indentLevel++;
  }
  moveCursorDown() {
    cursorX = this.x + tab;
    cursorY = this.y + lineGap + charHeight;
  }
}

class ReturnLine extends Line {
  constructor (x, y) {
    super (x, y);
    this.segments = [{
      chars: 7,
      color: colorScheme.keyword
    }];
    if (getBool()) {
      this.segments.push({
        chars: getNumberOneToFive() + getNumberOneToThree(),
        color: colorScheme.identifier
      })
    }
  }
}

class SwitchCaseLine extends BlockCloseLine {
  constructor (x, y) {
    super(x, y)
    this.segments = [
      {
        chars: 4,
        color: colorScheme.keyword
      },
      {
        chars: 2,
        color: colorScheme.number
      },
      {
        chars: 1,
        color: colorScheme.operator
      }
    ]
    indentLevel++;
  }
  moveCursorDown() {
    cursorX = this.x + tab;
    cursorY = this.y + lineGap + charHeight;
  }
}

//============= All sorts of block functions ==========
// each open function pushes a corresponding close function to the stack
var normalLines = [CommentLine, AssignmentLine, MutationLine, CallFunctionLine];

function addNormalBlock () {
  let numLines = getNumberOneToFive() + 2;
  for (let i = 0; i < numLines; i++){
    let rollDice = getNumberOneToTen();
    if (rollDice <= 1) {
      lines.push(new CommentLine);
    } else if (rollDice <= 4){
      lines.push(new AssignmentLine);
    }else if (rollDice <= 7){
      lines.push(new MutationLine);
    } else {
      lines.push(new CallFunctionLine);
    }
  }
}

function addBlockOf(lineClass, numLine) {
  for (let i = 0; i < numLine; i++) {
    lines.push(new lineClass());
  }
}

function functionOpen() {
  lines.push(new Line());
  addBlockOf(CommentLine, getNumberOneToThree());
  lines.push(new FunctionOpenLine());
  blockCloseFunctions.push(functionClose);
  functionLevel++;
}
function functionClose() {
  if (getBool()) lines.push(new ReturnLine()); //return 50% of time
  lines.push(new BlockCloseLine(), new Line());
  functionLevel--;
}

function ifOpen () {
  lines.push(new BlockOpenLine());
  blockCloseFunctions.push(ifClose);
}
function ifClose() {
  if (getNumberOneToTen() < 5) {  
    lines.push(new ElseIfLine());  //50% else if 
    blockCloseFunctions.push(ifClose);
  } else {
    lines.push(new BlockCloseLine());
  }
}

function classOpen () {
  lines.push(new ClassOpenLine());
  blockCloseFunctions.push(classClose);
}
function classClose() {
  lines.push(new BlockCloseLine(), new Line());
}

function forOpen () {
  lines.push(new ForLoopOpenLine());
  blockCloseFunctions.push(loopClose);
}
function loopClose () {
  lines.push(new BlockCloseLine());
}

function switchOpen () {
  lines.push(new BlockOpenLine());
  blockCloseFunctions.push(switchClose);
}
function switchClose () {
  if (getNumberOneToTen() > 4) {    // 60% chance more switch cases
    lines.push(new FlowControlLine());
    lines.push(new SwitchCaseLine());
    blockCloseFunctions.push(switchClose);
  } else {
    lines.push(new BlockCloseLine());
  }
}

var openFunctions = [functionOpen, ifOpen, classOpen, forOpen, switchOpen];  //second ifOpen is while open

function addCloseBlock() {
  if (indentLevel > 0 && blockCloseFunctions.length > 0){    
    blockCloseFunctions.pop().call();
    indentLevel--;
  } 
}
function addOpenBlock() {
  if (functionLevel === 0) {
    if (getNumberOneToFive() >= 2) {
      functionOpen();
    } else {
      classOpen();
    }
    blocksSinceLevelOne = 0;
  } else {
    openFunctions[getNumberOneToFive()-1].call();
  }
  indentLevel++;
}
// finally, the all-in-one function
function addRandomBlock () {
  //formula of nesting chance 
  let nestingChance = -0.1667*Math.pow(indentLevel, 3) + 1.5*Math.pow(indentLevel, 2) - 5.333*indentLevel + 7 - blocksSinceLevelOne * 0.7;
  let closingChance = (indentLevel <= 0 || blocksSinceLastClose ===0 )? 0: 8 * blocksSinceLastClose + blocksSinceLevelOne - 4;
  if (getNumberOneToTen() <= nestingChance) {
    addOpenBlock();
    blocksSinceLastClose = 0;
  } else if (getNumberOneToTen() <= closingChance){
    addCloseBlock();
    blocksSinceLastClose = 0;
  } else {
    blocksSinceLastClose++;
    addNormalBlock();
  } 
  if (indentLevel > 0) {
    blocksSinceLevelOne++;
  } else {
    blocksSinceLevelOne=-1;
  }
}

//===========listhenr functions===============
function slowDown () {
  Speed /= 2;
  pixelPerMove = Math.ceil(charHeight * Speed); 
}

function speedUp () {
  Speed *= 2;
  pixelPerMove = Math.ceil(charHeight * Speed); 
}

// the animate function!
function animate () {
  for (let i = lines.length-1; i >= 0; i--){
    if (!lines[i].updateDraw()) {
      // remove lines that are over the top
      delete lines[i];
      lines.splice(i, 1);
    }
  }
  while (cursorY <= canvas.height) {
    addRandomBlock();
  }  
  window.requestAnimationFrame(animate);
}

function init() {
  window.onresize = updateCanvas; 
  updateCanvas();
  container.onmouseenter = slowDown;
  container.onmouseleave = speedUp;
  generateRandomNumbers()
  .then(()=> {animate();});
}

init();
