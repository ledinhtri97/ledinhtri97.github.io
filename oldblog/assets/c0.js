var Solver = new function() {
	var p;
	var m = this;


	// Setup game view support data
	m.mvP = [[32, 10, -77], [-5, 16, 62]];
	m.bvP = [[32, 10, -153], [-5, 16, -28]];

	m.imageCache = function () {
		var images, makeImage, imageCache, imageName;

		// Game art directory
		images = {	'N':{fn:'266.png',w:49,h:33}, 'O':{fn:'292.png',w:49,h:33}, 'X':{fn:'294.png',w:49,h:33},
				'#':{fn:'297a.png',w:53,h:31}, 'W':{fn:'317.png',w:49,h:33}, 'S':{fn:'315a.png',w:52,h:34},
				'goal':{fn:'m1a.png',w:49,h:33}, 'avoid':{fn:'m2a.png',w:49,h:33},
				'avoidgoal':{fn:'m3a.png',w:49,h:33}, 'occupied':{fn:'m4a.png',w:49,h:33},
				'occupiedgoal':{fn:'m5a.png',w:49,h:33}, 'occupiedavoid':{fn:'m6a.png',w:49,h:33},
				'occupiedavoidgoal':{fn:'m7a.png',w:49,h:33}, 'block_v':{fn:'872.png',w:200,h:150},
				'block_ew':{fn:'976.png',w:200,h:150}, 'block_ns':{fn:'892.png',w:200,h:150}};

		// Image generation is browser-specific, due to limited IE PNG support
		if ((browser.isIE55 || browser.isIE6x) && browser.isWin32)
		{
			makeImage = function (imgName) {
				var o = images[imgName];
				if (!o) { return; }

				var s	= "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + o.fn + "',sizingMethod='scale')";
				var div	= document.createElement('DIV');
				div.style.width		= o.w + 'px';
				div.style.height	= o.h + 'px';
				div.style.filter	= s;
				return div;
			};
		}
		else
		{
			makeImage = function (imgName) {
				var o = images[imgName];
				if (!o) { return; }

				var img = document.createElement('IMG');
				img.src = o.fn;
				return img;
			};
		}

		imageCache = {};
		for (var imageName in images)
		{
			if (images.hasOwnProperty(imageName)) { imageCache[imageName] = makeImage(imageName); }
		
		}
		return imageCache;
	}();


	m.ClearNode = function (e) {
		while (e.firstChild)
		{
			e.removeChild(e.firstChild);
		}
	};

	m.MakeImage = function (name) {
		var o = this.imageCache[name];
		if (o) { return o.cloneNode(true); }
	};

	// Designed to be bound to a <BUTTON> tag
	m.HandleFieldClick = function () {
		app.TakeAction(this.cell.x, this.cell.y);
	};


	// Positions stored as two (X,Y) pairs, sorted on (X,Y)
	m.BlockPos = function (x0, y0, x1, y1) {
		if ((x0 < x1) || ((x0 == x1) && (y0 < y1)))
		{	
			this.x0 = x0;
			this.y0 = y0;
			this.x1 = x1;
			this.y1 = y1;
		}
		else
		{
			this.x0 = x1;
			this.y0 = y1;
			this.x1 = x0;
			this.y1 = y0;
		}
	};

	//here
	p = m.BlockPos.prototype;

	p.JoinedP = function () {
		if ((this.x0 == this.x1) && (Math.abs(this.y0 - this.y1) == 1))
		{
			return true;
		}
		if ((this.y0 == this.y1) && (Math.abs(this.x0 - this.x1) == 1))
		{
			return true;
		}
		return false;
	};

	p.EqualP = function (rhs) {
		return ((this.x0 == rhs.x0) &&
			(this.y0 == rhs.y0) &&
			(this.x1 == rhs.x1) &&
			(this.y1 == rhs.y1) );
	};

	p.MakeKey = function () {
		return [this.x0, this.x1, this.y0, this.y1].join('_');
	};

	// Assumes a rectangular block; doesn't handle split cubes
	p.NextPositions = function () {
		var rv = [];
		if ((this.x0 == this.x1) && (this.y0 == this.y1))
		{
			// Flop in one of 4 cardinal directions
			rv.push(new m.BlockPos(this.x0, this.y0+1, this.x0, this.y0+2));
			rv.push(new m.BlockPos(this.x0, this.y0-1, this.x0, this.y0-2));
			rv.push(new m.BlockPos(this.x0+1, this.y0, this.x0+2, this.y0));
			rv.push(new m.BlockPos(this.x0-1, this.y0, this.x0-2, this.y0));
		}
		else if (this.x0 == this.x1)
		{
			// Roll sideways, or flop vertical
			rv.push(new m.BlockPos(this.x0+1, this.y0, this.x1+1, this.y1));
			rv.push(new m.BlockPos(this.x0-1, this.y0, this.x1-1, this.y1));
			rv.push(new m.BlockPos(this.x0, this.y0-1, this.x1, this.y1-2));
			rv.push(new m.BlockPos(this.x0, this.y0+2, this.x1, this.y1+1));
		}
		else if (this.y0 == this.y1)
		{
			// Roll sideways, or flop vertical
			rv.push(new m.BlockPos(this.x0, this.y0+1, this.x1, this.y1+1));
			rv.push(new m.BlockPos(this.x0, this.y0-1, this.x1, this.y1-1));
			rv.push(new m.BlockPos(this.x0-1, this.y0, this.x1-2, this.y1));
			rv.push(new m.BlockPos(this.x0+2, this.y0, this.x1+1, this.y1));
		}
		else
		{
			// Split cubes; we don't currently handle this
			// (Note that not all split-cube cases will be detected here)
			return undefined;
		}
		return rv;
	};

	p.Render = function (gameId, blockId) {
		this.Erase(blockId);

		var img, x, y;
		if ((this.x0 == this.x1) && (this.y0 == this.y1))
		{
			img = m.MakeImage('block_v'); x = this.x0; y = this.y0;
		}
		else if (this.x0 == this.x1)
		{
			img = m.MakeImage('block_ns'); x = this.x1; y = this.y1;
		}
		else if (this.y0 == this.y1)
		{
			img = m.MakeImage('block_ew'); x = this.x0; y = this.y0;
		}
		if (!img) { return; }

		img.id		= blockId;
		img.style.left	= m.bvP[0][0]*x + m.bvP[0][1]*y + m.bvP[0][2] + 'px';
		img.style.top	= m.bvP[1][0]*x + m.bvP[1][1]*y + m.bvP[1][2] + 'px';
		document.getElementById(gameId).appendChild(img);
	};

	p.Erase = function (blockId) {
		var e = document.getElementById(blockId);
		if (e) { e.parentNode.removeChild(e); }
	};


	m.Cell = function (x, y, type, bOccupied, bAvoid, bGoal) {
		this.x		= x;
		this.y		= y;
		this.type	= type;
		this.bOccupied	= bOccupied;
		this.bAvoid	= bAvoid;
		this.bGoal	= bGoal;
	};
	p = m.Cell.prototype;

	p.Load = function (data) {
		var code = parseInt(data.charAt(1));

		this.type	= data.charAt(0);
		this.bOccupied	= Boolean(code&4);
		this.bAvoid	= Boolean(code&2);
		this.bGoal	= Boolean(code&1);
	};

	p.Save = function () {
		return this.type + ((this.bOccupied?4:0) + (this.bAvoid?2:0) + (this.bGoal?1:0));
	};

	p.Render = function (btn) {
		var className = '';
		if (this.bOccupied)
		{
			className += 'occupied';
		}
		if (this.bAvoid && ((this.type == 'O') || (this.type == 'X') || (this.type == 'S')))
		{
			className += 'avoid';
		}
		if (this.bGoal)
		{
			className += 'goal';
		}
		if (!className)
		{
			className = 'normal';
		}

		if (btn)
		{
			m.ClearNode(btn);
			btn.cell	= this;
			btn.onclick	= m.HandleFieldClick;
			btn.className	= className;
			btn.appendChild(document.createTextNode(this.type));
		}
		else
		{
			var img, imgs = [];
			if (img = m.MakeImage(this.type))
			{
				img.style.left	= m.mvP[0][0]*this.x + m.mvP[0][1]*this.y + m.mvP[0][2] + 'px';
				img.style.top	= m.mvP[1][0]*this.x + m.mvP[1][1]*this.y + m.mvP[1][2] + 'px';
				imgs.push(img);
			}
			if (img = m.MakeImage(className))
			{
				img.style.left	= m.mvP[0][0]*this.x + m.mvP[0][1]*this.y + m.mvP[0][2] + 'px';
				img.style.top	= m.mvP[1][0]*this.x + m.mvP[1][1]*this.y + m.mvP[1][2] + 'px';
				imgs.push(img);
			}
			return imgs;
		}
	};

	p.LegalP = function (pressure) {
		switch (this.type)
		{
			case 'O':
				return !this.bAvoid;
			case 'X':
			case 'S':
				return ((pressure <= 1) || !this.bAvoid);
			case 'N':
				return true;
			case 'W':
				return pressure <= 1;
			case '#':
				return true;
			default:
				return false;
		}
	};


	m.Board = function (size) {
		this.size	= size;
		this.cells	= new Array(size);

		for (var y = 0; y < this.size; y++)
		{
			this.cells[y] = new Array(size);
			for (var x = 0; x < this.size; x++)
			{
				this.cells[y][x] = new m.Cell(x, y, '.', false, false, false);
			}
		}
	};
	p = m.Board.prototype;

	p.CalcOrdinal = function (x, y) {
		return (y + 1)*this.size - x;
	};

	p.GetCell = function (x, y) {
		if (this.cells[y] && this.cells[y][x])
		{
			return this.cells[y][x];
		}
		else
		{
			return new m.Cell(x, y, '.', false, false, false);
		}
	};

	p.SetAttr = function (x, y, name, value) {
		if (value == undefined)
		{
			this.GetCell(x, y)[name] = !this.GetCell(x, y)[name];
		}
		else
		{
			this.GetCell(x, y)[name] = value;
		}
	};

	p.Load = function (data) {
		if (data.length < this.size*this.size)
		{
			return false;
		}

		var y, x, i = 0;
		for (y = 0; y < this.size; y++)
		{
			for (x = 0; x < this.size; x++)
			{
				this.cells[y][x].Load(data[i++]);
			}
		}
		return true;
	};

	p.Save = function () {
		var y, x, i = 0, rv = new Array(this.size*this.size);
		for (y = 0; y < this.size; y++)
		{
			for (x = 0; x < this.size; x++)
			{
				rv[i++] = this.cells[y][x].Save();
			}
		}
		return rv;
	};

	p.Render2D = function (editId) {
		var tbl = document.createElement('TABLE');
		var bdy = tbl.appendChild(document.createElement('TBODY'));

		var row, cel, btn;
		for (var y = 0; y < this.size; y++)
		{
			row = bdy.appendChild(document.createElement('TR'));
			for (var x = 0; x < this.size; x++)
			{
				cel = row.appendChild(document.createElement('TD'));
				btn = cel.appendChild(document.createElement('BUTTON'));
				this.GetCell(x, y).Render(btn);
			}
		}

		var n0 = document.getElementById(editId);
		m.ClearNode(n0);
		n0.appendChild(tbl);
	};

	p.RenderIso = function (gameId) {
		var n1 = document.getElementById(gameId);
		m.ClearNode(n1);

		var img, i;
		for (var y = 0; y < this.size; y++)
		{
			for (var x = this.size-1; x >= 0; x--)
			{
				img = this.GetCell(x, y).Render();
				for (i = 0; i < img.length; i++)
				{
					img[i].ordinal = this.CalcOrdinal(x, y);
					n1.appendChild(img[i]);
				}
			}
		}
	};

	p.RenderCell2D = function (x, y, editId) {
		var btn = document.getElementById(editId).firstChild.firstChild.childNodes[y].childNodes[x].firstChild;
		this.GetCell(x, y).Render(btn);
	};

	p.RenderCellIso = function (x, y, gameId) {
		var img = this.GetCell(x, y).Render();
		var ord = this.CalcOrdinal(x, y);

		var i, next = null, n = document.getElementById(gameId);
		for (i = n.childNodes.length-1; i >= 0; i--)
		{
			if (!n.childNodes[i].ordinal)
			{
				// Not a sorted image node; ignore it
				continue;
			}
			else if (n.childNodes[i].ordinal < ord)
			{
				// Image node for a background cell; no more interesting cells will be found
				break;
			}
			else if (n.childNodes[i].ordinal == ord)
			{
				// Image node for the current cell
				n.removeChild(n.childNodes[i]);
			}
			else
			{
				// Image node for a foreground cell
				next = n.childNodes[i];
			}
		}
		for (i = 0; i < img.length; i++)
		{
			img[i].ordinal = ord;
			n.insertBefore(img[i], next);
		}
	};

	p.GetMarkedPos = function (testFxn, desc) {
		var cell, cells = [];
		for (var y = 0; y < this.size; y++)
		{
			for (var x = 0; x < this.size; x++)
			{
				cell = this.GetCell(x, y);
				if (testFxn(cell))
				{
					cells.push(cell);
				}
			}
		}
		switch (cells.length)
		{
			case 0:
				alert('At least one cell must be marked as ' + desc);
				break;
			case 1:
				return new m.BlockPos(cells[0].x, cells[0].y, cells[0].x, cells[0].y);
				break;
			case 2:
				var p = new m.BlockPos(cells[0].x, cells[0].y, cells[1].x, cells[1].y);
				if (!p.JoinedP())
				{
					alert('Cells marked as ' + desc + ' must be adjacent');
				}
				else
				{
					return p;
				}
				break;
			default:
				alert('No more than 2 cells may be marked as ' + desc);
				break;
		}
	};

	p.GetStartPos = function () {
		return this.GetMarkedPos(function (cell) { return cell.bOccupied; }, 'occupied');
	};

	p.GetEndPos = function () {
		return this.GetMarkedPos(function (cell) { return cell.bGoal; }, 'goal');
	};

	p.FilterPositions = function (a) {
		var p, rv = [];
		for (var i = 0; i < a.length; i++)
		{
			p = a[i];
			if ((p.x0 == p.x1) && (p.y0 == p.y1))
			{
				if (this.GetCell(p.x0, p.y0).LegalP(2))
				{
					rv.push(p);
				}
			}
			else
			{
				if (this.GetCell(p.x0, p.y0).LegalP(1) && this.GetCell(p.x1, p.y1).LegalP(1))
				{
					rv.push(p);
				}
			}
		}
		return rv;
	};

	p.Pathfind = function (startPos, endPos) {
		var queue	= [];
		var prevLUT	= {};
		var i, a, k, p, np;

		// Build tree
		queue.push(endPos);
		prevLUT[endPos.MakeKey()] = null;
		while (queue.length)
		{
			p = queue.shift();
			a = this.FilterPositions(p.NextPositions());
			for (i = 0; i < a.length; i++)
			{
				np = a[i]; k = np.MakeKey();
				if (typeof(prevLUT[k]) != "undefined")
				{
					continue;
				}

				queue.push(np);
				prevLUT[k] = p;

				if (np.EqualP(startPos))
				{
					queue.length = 0;
					break;
				}
			}
		}

		// Walk tree backwards
		var rv = [];
		for (p = startPos, k = p.MakeKey(), rv.push(p); np = prevLUT[k]; p = np, k = p.MakeKey(), rv.push(p));
		if (rv[rv.length-1].EqualP(endPos))
		{
			return rv;
		}
	};
}();



function App(size)
{
	// Puzzle statement
	this.board = new Solver.Board(size);

	// Predefined maps
	this.maps		= [];

	// Cursor state
	this.actionName		= undefined;
	this.actionValue	= undefined;

	// Animation control
	this.hInterval		= undefined;
	this.msDelay		= 500;
	this.path		= undefined;
	this.location		= 0;

	// Interface mode
	this.mode		= 'game';

	// Display on startup
	this.RenderBoard();
	this.RenderControls();

	// Copy hiding doesn't work properly in IE
	if (browser.isIE55 || browser.isIE6x)
	{
		var ctl = document.getElementById('copyswitch');
		ctl.parentNode.removeChild(ctl);
	}
}

App.prototype.SetQuickloads = function (maps) {
	var sel = document.getElementById('selLevel');
	Solver.ClearNode(sel);

	// IE6 can't seem to reliably resize SELECT elements
	if (browser.isIE55 || browser.isIE6x)
	{
		sel.style.width = '8em';
	}

	this.maps = maps;
	for (var i = 0; maps[i]; i++)
	{
		sel.appendChild(document.createElement('OPTION')).appendChild(document.createTextNode(maps[i].name));
	}

	if (this.maps.length >= 2)
	{
		sel.selectedIndex = 1;
		this.Load();
	}
};


App.prototype.MakeShowClickHandler = function () {
	var o = this;

	// Designed to be bound to an <A> tag
	return function () { this.blur(); o.ShowCopy(); return false; };
};

App.prototype.MakeHideClickHandler = function () {
	var o = this;

	// Designed to be bound to an <A> tag
	return function () { this.blur(); o.HideCopy(); return false; };
};

App.prototype.HideCopy = function () {
	var ctl = document.getElementById('copyswitch');
	var txt = document.getElementById('copycontent');

	ctl.firstChild.nodeValue = "Show Introduction";
	ctl.onclick = this.MakeShowClickHandler();

	txt.style.display = 'none';
};

App.prototype.ShowCopy = function () {
	var ctl = document.getElementById('copyswitch');
	var txt = document.getElementById('copycontent');

	ctl.firstChild.nodeValue = "Hide Introduction";
	ctl.onclick = this.MakeHideClickHandler();

	txt.style.display = 'block';
};

App.prototype.SetMode = function (mode) {
	this.mode = mode;
	this.RenderBoard();
	this.RenderBlock();
	this.RenderControls();
	return false;
};


App.prototype.FmtMaps = function () {
	var i, y, s, a = [];

	a.push("app.SetQuickloads([");
	for (i = 0; i < this.maps.length; i++)
	{
		a.push("{name: '" + this.maps[i].name + "',");
		for (y = 0; y < this.board.size; y++)
		{
			s = this.maps[i].data.slice(y*this.board.size, (y+1)*this.board.size).join("', '");
			a.push((y?"\t'":" data: ['") + s + "',");
		}
		a[a.length-1] += "]},";
	}
	a.push("]);\n");

	return a.join('\n');
};

App.prototype.PostMaps = function (s) {
	// Don't get your hopes up; it's disabled on the server-side, too.
	return true;

	var data = 'maps=' + encodeURIComponent(s);

	var xhr = undefined;
	try
	{
		xhr = new XMLHttpRequest();
	}
	catch (tryMS)
	{
		try
		{
			xhr = new ActiveXObject("Msxml2.XMLHTTP");
		}
		catch (otherMS)
		{
			try
			{
				xhr = new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch (failed)
			{
				xhr = undefined;
			}
		}
	}
	if (!xhr) { return false; }

	xhr.open('POST', 'save.php3', false);
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.setRequestHeader('Content-Length', data.length);
	xhr.setRequestHeader('Connection', 'close');
	xhr.send(data);
	return true;
};

App.prototype.Save = function () {
	var obj = this.maps[document.getElementById('selLevel').selectedIndex];
	if (obj)
	{
		obj.data = this.board.Save();
		this.PostMaps(this.FmtMaps());
		alert('Saved map');
	}
	else
	{
		alert('ERROR: Map could not be saved');
	}
};

App.prototype.SaveAs = function () {
	// New name
	var name = document.getElementById('saveAsName').value;

	// Update control
	var sel = document.getElementById('selLevel');
	sel.appendChild(document.createElement('OPTION')).appendChild(document.createTextNode(name));
	sel.selectedIndex = this.maps.length;

	// Update maps
	this.maps.push({name:name, data:[]});

	// Save normally
	this.Save();
};


App.prototype.SetAction = function (name, value) {
	this.actionName		= name;
	this.actionValue	= value;
};

App.prototype.TakeAction = function (x, y) {
	if ((this.actionName != undefined) && (this.hInterval == undefined))
	{
		this.board.SetAttr(x, y, this.actionName, this.actionValue);
		this.RenderCell(x, y);

		this.path = undefined;

		this.RenderControls();
	}
};

App.prototype.Load = function () {
	var obj = this.maps[document.getElementById('selLevel').selectedIndex];
	if (!obj) { return; }

	this.StopAnimation();
	if ((this.hInterval == undefined) && this.board.Load(obj.data))
	{
		this.path = undefined;

		this.RenderBoard();
		this.RenderControls();
	}
};

App.prototype.Solve = function () {
	if (this.hInterval)
	{
		return;
	}

	var sPos = this.board.GetStartPos();
	var ePos = this.board.GetEndPos();
	if (!sPos || !ePos)
	{
		return;
	}
	if (this.board.FilterPositions([sPos, ePos]).length != 2)
	{
		alert('Start and/or goal positions are illegal!');
		return;
	}

	var path = this.board.Pathfind(sPos, ePos);
	if (!path)
	{
		alert('Destination unreachable!');
	}
	else
	{
		this.path = path;
		this.location = 0;
		this.StartAnimation();
	}
};

App.prototype.Clear = function () {
	if (!this.hInterval)
	{
		// Puzzle statement
		this.board = new Solver.Board(this.board.size);

		// Animation control
		this.path = undefined;

		// Display
		this.RenderBoard();
		this.RenderControls();
	}
};

App.prototype.StartAnimation = function () {
	if (!this.hInterval && this.path)
	{
		var o = this;
		var f = function () { o.Animate(); };
		this.hInterval = window.setInterval(f, this.msDelay);

		this.RenderBlock();
		this.RenderControls();
	}
};

App.prototype.ResetAnimation = function () {
	if (this.path)
	{
		// Calc current occupied position
		var cp = this.path[this.location];

		// Reset index
		this.location = 0;

		// Calc new occupied position
		var np = this.path[this.location];

		// Execute move
		this.Move(cp, np);
	}
};

App.prototype.StopAnimation = function () {
	if (this.hInterval)
	{
		window.clearInterval(this.hInterval);
		this.hInterval = undefined;

		this.path[this.location].Erase('block_img');
		this.RenderControls();
	}
};


App.prototype.Move = function (oldPos, newPos) {
	// Clear current occupied position
	this.board.SetAttr(oldPos.x0, oldPos.y0, 'bOccupied', false);
	this.board.SetAttr(oldPos.x1, oldPos.y1, 'bOccupied', false);
	this.RenderCell(oldPos.x0, oldPos.y0);
	this.RenderCell(oldPos.x1, oldPos.y1);

	// Draw new occupied position
	this.board.SetAttr(newPos.x0, newPos.y0, 'bOccupied', true);
	this.board.SetAttr(newPos.x1, newPos.y1, 'bOccupied', true);
	this.RenderCell(newPos.x0, newPos.y0);
	this.RenderCell(newPos.x1, newPos.y1);

	// Draw the block (or, at least, try to)
	this.RenderBlock();
};

App.prototype.Animate = function () {
	// Calc current occupied position
	var cp = this.path[this.location];

	// Advance index
	this.location = (this.location + 1) % this.path.length;

	// Calc new occupied position
	var np = this.path[this.location];

	// Execute move
	this.Move(cp, np);
};

App.prototype.RenderBoard = function () {
	if (this.mode == 'edit')
	{
		this.board.Render2D('field');
	}
	else if (this.mode == 'game')
	{
		this.board.RenderIso('gameboard');
	}
};

App.prototype.RenderCell = function (x, y) {
	if (this.mode == 'edit')
	{
		this.board.RenderCell2D(x, y, 'field');
	}
	else if (this.mode == 'game')
	{
		this.board.RenderCellIso(x, y, 'gameboard');
	}
};

App.prototype.RenderBlock = function () {
	if ((this.mode == 'game') && this.hInterval)
	{
		this.path[this.location].Render('gameboard', 'block_img');
	}
};

App.prototype.RenderControls = function () {
	var i, a;

	// Render mode buttons
	document.getElementById('mode_edit').checked = (this.mode == 'edit');
	document.getElementById('mode_game').checked = (this.mode == 'game');

	// Render core interface
	document.getElementById('editboard').style.display = (this.mode == 'edit')?"block":"none";
	document.getElementById('gameboard').style.display = (this.mode == 'game')?"block":"none";
	
	// Render command buttons
	if (this.hInterval)
	{
		// When animating, display start/reset/stop controls only
		a = document.getElementById('palette').getElementsByTagName('TABLE');
		for (i = 0; i < a.length; i++)
		{
			a[i].style.display = 'none';
		}
		document.getElementById('btnSolve').style.display = 'none';
		document.getElementById('btnClear').style.display = 'none';
		document.getElementById('btnStart').style.display = 'inline';
		document.getElementById('btnReset').style.display = 'inline';
		document.getElementById('btnStop').style.display = 'inline';
	}
	else if (this.path)
	{
		// When not animating, but a path is computed,
		// display start/reset/stop controls and edit controls
		a = document.getElementById('palette').getElementsByTagName('TABLE');
		for (i = 0; i < a.length; i++)
		{
			a[i].style.display = 'block';
		}
		document.getElementById('btnSolve').style.display = 'none';
		document.getElementById('btnClear').style.display = 'inline';
		document.getElementById('btnStart').style.display = 'inline';
		document.getElementById('btnReset').style.display = 'inline';
		document.getElementById('btnStop').style.display = 'inline';
	}
	else
	{
		// When not animating, and no path is computed,
		// display edit and solve controls
		a = document.getElementById('palette').getElementsByTagName('TABLE');
		for (i = 0; i < a.length; i++)
		{
			a[i].style.display = 'block';
		}
		document.getElementById('btnSolve').style.display = 'inline';
		document.getElementById('btnClear').style.display = 'inline';
		document.getElementById('btnStart').style.display = 'none';
		document.getElementById('btnReset').style.display = 'none';
		document.getElementById('btnStop').style.display = 'none';
	}
};


var app = new App(17);
