document.addEventListener("DOMContentLoaded", () => {
// to get the canvas element from webpage
let canvas = document.querySelector("#board");
//assigning windows dimension to the canvas element dimension
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let tool = canvas.getContext("2d");
const socket=io();
let isDrawing = false; //flag

/***************tool selector logic************************************/
let pencilControls = document.querySelector("#pencilControls");
let colorPicker = document.querySelector("#colorPicker");
let lineWidth = document.querySelector("#lineWidth");
let toolArr = document.querySelectorAll(".tool");
//tool.strokeStyle = colorPicker.value; // default pencil color
//tool.lineWidth = lineWidth.value; // default pencil line width
let isMinimized = false;
let currentTool = "pencil";
// Add event listeners to color picker and line width
colorPicker.addEventListener("input", function () {
  if (currentTool === "pencil") {
    tool.strokeStyle = colorPicker.value;
  }
});

lineWidth.addEventListener("input", function () {
  if (currentTool === "pencil") {
    tool.lineWidth = lineWidth.value;
  }
});
for (let i = 0; i < toolArr.length; i++) {
  toolArr[i].addEventListener("click", function (e) {
    const toolname = toolArr[i].id;
    if (toolname == "pencil") {
      currentTool = "pencil";
      tool.strokeStyle = colorPicker.value; // set to current color
      tool.lineWidth = lineWidth.value; // set to current line width
      console.log("pencil clicked");
      pencilControls.style.display = isMinimized == true ? "block" : "none";
      isMinimized = !isMinimized;
    } else if (toolname == "eraser") {
      currentTool = "eraser";
      tool.strokeStyle = "white";
      console.log("eraser is clicked");
      tool.lineWidth = 5;
    } else if (toolname == "sticky") {
      currentTool = "sticky";
      createSticky();
    } else if (toolname == "upload") {
      currentTool = "upload";
      //console.log(e.target);
      uploadFile();
    } else if (toolname == "download") {
      console.log("download clicked");
      currentTool = "download";
      downloadFile();
    } else if (toolname == "undo") {
      currentTool = "undo";
      console.log("undo clicked");
      undoFN();
    } else if (toolname == "redo") {
      currentTool = "redo";
      console.log("redo clicked");
      redoFN();
    }
  });
}

//when holding the mouse
let undoStack = [];
let redoStack = [];

canvas.addEventListener("mousedown", function (e) {
  isDrawing = true;
  let toolbarheight = getYDelta();
  let x = e.clientX;
  let y = e.clientY - toolbarheight;
  //drawing will start
  tool.beginPath();
  tool.moveTo(x, y);
  emitDrawingEvent("mousedown", x, y, tool.strokeStyle, tool.lineWidth);
  let pointDesc = {
    desc: "md",
    x: x,
    y: y,
    color: tool.strokeStyle,
  };
  undoStack.push(pointDesc);
});
canvas.addEventListener("mousemove", function (e) {
  if (isDrawing == false) return;
  let toolbarheight = getYDelta();
  let x = e.clientX;
  let y = e.clientY - toolbarheight;
  tool.lineTo(x, y);
  tool.stroke();
  emitDrawingEvent("mousemove", x, y);
  let pointDesc = {
    desc: "mm",
    x: x,
    y: y,
  };

  undoStack.push(pointDesc);
});

canvas.addEventListener("mouseup", function (e) {
  isDrawing = false;
});
//helper function
function emitDrawingEvent(type, x, y, color, width) {
  socket.emit('drawing', { type, x, y, color, width });
}
let toolBar = document.querySelector(".toolbar");
function getYDelta() {
  let heightoftoolBar = toolBar.getBoundingClientRect().height;
  return heightoftoolBar;
}

socket.on('drawing', (data) => {
  const { type, x, y, color, width } = data;
  if (type === "mousedown") {
    tool.beginPath();
    tool.moveTo(x, y);
    tool.strokeStyle = color;
    tool.lineWidth = width;
  } else if (type === "mousemove") {
    tool.lineTo(x, y);
    tool.stroke();
  }
  
});

//create outershell
function createOuterShell(textarea) {
  //element creation
  let stickydiv = document.createElement("div");
  let navdiv = document.createElement("div");
  let mindiv = document.createElement("div");
  let closediv = document.createElement("div");

  mindiv.innerText = "--";
  closediv.innerText = "X";

  //class styling
  stickydiv.setAttribute("class", "sticky");
  navdiv.setAttribute("class", "nav");
  mindiv.setAttribute("class", "minimize");
  closediv.setAttribute("class", "close");
  // html structure
  stickydiv.appendChild(navdiv);
  navdiv.appendChild(mindiv);
  navdiv.appendChild(closediv);
  //add it to the page
  document.body.appendChild(stickydiv);

  let isMinimized = false;
  closediv.addEventListener("click", function () {
    stickydiv.remove();
  });
  mindiv.addEventListener("click", function () {
    textarea.style.display = isMinimized == true ? "block" : "none";
    isMinimized = !isMinimized;
  });
  let isStickyDown = false;
  navdiv.addEventListener("mousedown", function (e) {
    //initial point
    initialX = e.clientX;
    initialY = e.clientY;
    isStickyDown = true;
  });
  navdiv.addEventListener("mousemove", function (e) {
    if (isStickyDown == true) {
      //final point
      let finalX = e.clientX;
      let finalY = e.clientY;
      //distance
      let dx = finalX - initialX;
      let dy = finalY - initialY;
      //move sticky
      let { top, left } = stickydiv.getBoundingClientRect();
      stickydiv.style.top = top + dy + "px";
      stickydiv.style.left = left + dx + "px";
      initialX = finalX;
      initialY = finalY;
    }
  });
  navdiv.addEventListener("mouseup", function () {
    isStickyDown = false;
  });
  return stickydiv;
}

//sticky function
function createSticky() {
  /*<div class="sticky">
  <div class="nav">
    <div class="minimize">min</div>
    <div class="close">X</div>
  </div>
  <textarea class="text-area"></textarea>
</div>
*/

  let textarea = document.createElement("textarea");
  textarea.setAttribute("class", "text-area");
  let stickydiv = createOuterShell(textarea);
  stickydiv.appendChild(textarea);
}

let inputTag = document.querySelector(".input-tag");
function uploadFile() {
  // 1. input tag -> file(<input type="file">) [hide] -> css
  // 2. click image icon -> input tag click
  inputTag.click();
  // 3. file read input tag
  inputTag.addEventListener("change", function () {
    //4.add it to UI
    let data = inputTag.files[0];
    let img = document.createElement("img");
    //src -> file url
    let url = URL.createObjectURL(data);
    img.src = url;
    img.setAttribute("class", "upload-img");
    // add it to the stickydiv
    let stickydiv = createOuterShell(img);
    stickydiv.appendChild(img);
  });
}
function downloadFile() {
  //create anchor
  //href=canvas->url
  // anchor click()
  //anchor remove()
  //download
  let a = document.createElement("a");
  //set filename to its download attribute
  a.download = "file.jpeg";
  //convert board to url
  let url = canvas.toDataURL("image/jpeg;base64");
  //set as url to href
  a.href = url;
  //click the anchor
  a.click();
  //remove the anchor
  a.remove();
}
function redraw() {
  for (let i = 0; i < undoStack.length; i++) {
    let { x, y, desc } = undoStack[i];
    if (desc == "md") {
      tool.beginPath();
      tool.moveTo(x, y);
    } else if (desc == "mm") {
      tool.lineTo(x, y);
      tool.stroke();
    }
  }
}
function undoFN() {
  // clear screen
  // pop
  if (undoStack.length > 0) {
    tool.clearRect(0, 0, canvas.width, canvas.height);
    redoStack.push(undoStack.pop());
    // last removal
    // redraw
    redraw();
  }
}

function redoFN() {
  if (redoStack.length > 0) {
    // screen clear
    tool.clearRect(0, 0, canvas.width, canvas.height);
    undoStack.push(redoStack.pop());
    redraw();
  }
}
});