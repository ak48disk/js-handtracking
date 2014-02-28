window.onload=loadAssets;
var stats;

function loadAssets()
{
	assetsManager=new FruitGame.AssetsManager();
	assetsManager.addEventListener("complete",init);
	assetsManager.start();
};
function init()
{
	document.getElementById("loading").style.display='none';
	document.getElementById("info").style.display='block';
	
	//canvas
	topCanvas=document.getElementById("top");
	topCanvas.style.display="block";
	topCanvas.width=gameWidth;
	topCanvas.height=gameHeight;
	topContext=topCanvas.getContext("2d");
	topContext.globalCompositeOperation = "lighter";
	
	
	middleCanvas=document.getElementById("middle");
	middleCanvas.style.display="block";
	middleCanvas.width=gameWidth;
	middleCanvas.height=gameHeight;
	middleContext=middleCanvas.getContext("2d");
	
	bottomCanvas=document.getElementById("bottom");
	bottomCanvas.style.display="block";
	bottomCanvas.style.dispaly="none";
	bottomCanvas.width=gameWidth;
	bottomCanvas.height=gameHeight;
	bottomContext=bottomCanvas.getContext("2d");
	bottomContext.fillStyle="#f6c223";
	bottomContext.textAlign="left";
	bottomContext.textBaseline="top";
	
	//particle system
	particleSystem = new SPP.ParticleSystem();
	particleSystem.start();
	bladeSystem=new SPP.ParticleSystem();
	bladeSystem.start();
	fruitSystem=new SPP.ParticleSystem();
	fruitSystem.start();
	bombSystem=new SPP.ParticleSystem();
	bombSystem.start();
	gravity = new SPP.Gravity(0.15);
	
	//data
	if (typeof chrome.storage != "undefined")
		storage = chrome.storage.local;
	else
		storage = window.localStorage
	if(!storage.highScore)
	storage.highScore=0;
	gameState=GAME_READY;
	score=0;
	gameLife=3;
	ui_gamelifeTexture=assetsManager["gamelife-3"];
	gameLevel=0.1;
	
    // fps
    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild( stats.domElement );

	
	// Use hand tracking or mouse to control
	topCanvas.addEventListener('mousemove', mousemove, false);
	handtracking = new HandTracking(topCanvas.width, topCanvas.height);
	handtracking.addEventListener('handmove', handmove);
	
  render();
	enterGame();
	
	initControl();
};
function enterGame()
{
	showStartGameUI();
};

function resetGameData()
{
	gameState=GAME_READY;
	score=0;
	gameLife=3;
	ui_gamelifeTexture=assetsManager["gamelife-3"];
	gameLevel=0.1;
}
function startGame(e)
{
	hideStartGameUI();
	
	resetGameData();
	showScoreUI();
	gameState=GAME_PLAYING;
	
}
function renderTimer()
{
	if(gameState!=GAME_PLAYING)return;
	timer+=SPP.frameTime;
	if(timer>=interval)
	{
		timer=0;
		throwObject();	
	}
};
function throwObject()
{
    var n=(Math.random()*4>>0)+1;
    for(var i=0;i<n;i++)
    {
    	if(isThrowBomb())throwBomb();
        else throwFruit();
    };
   createjs.Sound.play("throwFruit");
}
function isThrowBomb()
{
	var n=Math.random() * 2;
	if(n<gameLevel)return true;
	return false;
};
function levelUpdate()
{
	gameLevel+=levelStep;
	if(gameLevel>1)
	{
		gameLevel=0.1;
	}
};

function gameOver()
{
	if(gameState==GAME_OVER)return;
	var l = fruitSystem.getParticles().length;
	while (l-- > 0)
	{
		fruitSystem.getParticles()[l].removeEventListener("dead",missHandler);
	}
	gameState=GAME_OVER;
	gameLife=0;
	ui_gamelifeTexture=assetsManager["gamelife-"+gameLife];
	ui_gameLife.texture=ui_gamelifeTexture;
	if(score>parseInt(storage["highScore"]))storage.highScore=score;
	showGameoverUI();
};
function gameOverComplete()
{
	replay();
};

function replay(e)
{
	hideGameoverUI();
};

//mouse event
function mousemove(e) {

	// Get the mouse position relative to the canvas element.
	if (e.layerX || e.layerX == 0)
	{
		// Firefox
		mouse.x = e.layerX;
		mouse.y = e.layerY;
	} else if (e.offsetX || e.offsetX == 0)
	{ // Opera
		mouse.x = e.offsetX;
		mouse.y = e.offsetY;
	};
	buildBladeParticle(mouse.x, mouse.y);
};
//hand tracking event
function handmove(e) {
	buildBladeParticle(e.x, e.y);
}
//render canvas
function render() 
{
	requestAnimationFrame(render);
  
	topContext.clearRect(0,0,gameWidth,gameHeight);
	middleContext.clearRect(0,0,gameWidth,gameHeight);
	bottomContext.clearRect(0,0,gameWidth,gameHeight);
  handtracking.tick();

	showScoreTextUI();
	fruitSystem.render();
	bombSystem.render();
	particleSystem.render();
	bladeSystem.render();
	
	buildColorBlade(bladeColor,bladeWidth);
	collideTest();
	levelUpdate();
	renderTimer();
	stats.update();
};

var GameControl = {
  message: 'Game Control',
  moveThreshold: 5,
  displayShadow: true,
};

function initControl() {
  var gui = new dat.GUI();
  gui.add(GameControl, 'message');
  gui.add(GameControl, 'moveThreshold', 0, 10).step(1.0);
  gui.add(GameControl, 'displayShadow').onChange(function(value) {
    var shadowCanvas = document.getElementById("shadow");
    if (value)
       shadowCanvas.style.display="block";
    else
       shadowCanvas.style.display="none";
  });
  gui.close();
};

