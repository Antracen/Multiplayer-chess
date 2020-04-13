let piece_selected = null;
let socket;
let perspective;

function setup() {
	socket = io();
	get_perspective();
	
	socket.on('board state', function(msg) {
		console.log('drawing board state');
		let board_state = msg.state;
		createCanvas(800, 800);
		draw_state(board_state);
		let pos = msg.selected;
		if(pos != null) {
			if(perspective == 'black') {
				pos[0] = 7 - pos[0];
				pos[1] = 7 - pos[1];
			}
			draw_letter_in_square(pos[0], pos[1], 'O', 'green');
		}
	});
}

function get_perspective() {
	socket.on('perspective', function(msg) {
		perspective = msg;
		alert('You are ' + perspective);
	});
}

function draw_state(board_state) {
	console.log('drawing current perspective ' + perspective);
	draw_checkerboard(perspective);
	fill_board(board_state);
}

function draw_checkerboard() {
	background(200);
	fill('#7d561f');
	let offset;
	for(let i = 0; i < 8; i++) {
		if(i % 2 == 0) offset = 100;
		else offset = 0;
		for(let j = 0; j < 8; j++) {
			if(perspective == 'bystander') {
				rect(j*200 + offset - 100,i*100,100,100);
			} else {
				rect(j*200 + offset,i*100,100,100);
			}
		}
	}
}

function fill_board(state) {
	for(let i = 0; i < 64; i++) {
		let color = state[i*2];
		let piece = state[i*2+1];
		if(state[i*2] != 'N') {
			if(perspective == 'white') {
				draw_letter_in_square(i % 8, floor(i / 8), piece, color);
			}
			else if(perspective == 'black') {
				draw_letter_in_square(7 - (i % 8), 7 - floor(i / 8), piece, color);
			} else {
				draw_letter_in_square(7 - floor(i / 8), (i % 8), piece, color);
			}
		}
	}
}

function draw_letter_in_square(x, y, letter, color) {
	if(color == 'B') fill('black');
	else if(color == 'W') fill('white');
	else fill(color);

	let key = color + letter;

	let pieces = {
		'WR': '♖',
		'WN': '♘',
		'WB': '♗',
		'WQ': '♕',
		'WK': '♔',
		'WP': '♙',
		'BR': '♜',
		'BN': '♞',
		'BB': '♝',
		'BQ': '♛',
		'BK': '♚',
		'BP': '♟'}

	if(key in pieces) letter = pieces[key];

	textSize(60);
	textAlign(CENTER);
	text(letter,100*x+50,height - (100*y+50));
}

function touchEnded() {
	if(perspective == 'bystander') return;
	if(mouseX < 0 || mouseX > width) return;
	if(mouseY < 0 || mouseY > height) return;

	let x = floor(map(mouseX, 0, width, 0, 8));
	let y = floor(map(mouseY, 0, width, 8, 0));

	if(perspective == 'black') {
		x = 7-x;
		y = 7-y;
	}

	socket.emit('square press', [x,y]);
}