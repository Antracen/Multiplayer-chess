var express = require('express')
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

let white_client = null;
let black_client = null;
let turn = 'white';
let piece_selected = null;
let board = "WRWNWBWQWKWBWNWRWPWPWPWPWPWPWPWPNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNBPBPBPBPBPBPBPBPBRBNBBBQBKBBBNBR".split("");

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.use(express.static('client'));

io.on('connection', function(socket) {

	console.log('user connected');

	let perspective = 'bystander';
	
	if(white_client == null) {
		white_client = socket.id;
		perspective = 'white';
		console.log('white player joined');
	}
	else if(black_client == null) {
		black_client = socket.id;
		perspective = 'black';
		console.log('black player joined');
	}

	socket.emit('perspective', perspective);
	socket.emit('board state', {state:board,
								selected: piece_selected});

	socket.on('query board', function(msg) {
		console.log('queried board');
		socket.emit('board state', {state:board,
									selected: piece_selected});
	});

	socket.on('query turn', function(msg) {
		socket.emit('turn', turn)
	});

	socket.on('square press', function(msg) {

		if(turn == 'white' && socket.id != white_client) return;
		if(turn == 'black' && socket.id != black_client) return;

		handle_press(msg);
		
		if(piece_selected == null) {
			io.emit('board state', {state:board,
				selected: piece_selected});
		}
		else {
			socket.emit('board state', {state:board,
				selected: piece_selected});
		}
	});

	socket.on('disconnect', function() {
		if(white_client == socket.id) white_client = null;
		else if(black_client == socket.id) black_client = null;
		console.log('user disconnected');
	});
});

http.listen(25565, function() {
	console.log('Server listening');
});

function handle_press(pos) {
	if(piece_selected == null) {
		piece_selected = pos;
		console.log('selected piece')
	} 
	else {
		console.log('requesting move piece');
		if(check_validity_of_move(piece_selected, pos)) {
			console.log('moving piece');
			move_piece(piece_selected, pos);
		}
		piece_selected = null;
	}
}

function move_piece(from, to) {
	let from_index = from[0] + from[1]*8;
	let to_index = to[0] + to[1]*8;

	board[2*to_index] = board[2*from_index];
	board[2*to_index + 1] = board[2*from_index + 1];
	board[2*from_index] = 'N';
	board[2*from_index + 1] = 'N';

	if(turn == 'white') turn = 'black';
	else if(turn == 'black') turn = 'white';
}

function check_validity_of_move(from, to) {

	if(to[0] < 0 || to[0] > 7 || to[1] < 0 || to[1] > 7) return false;

	let piece_color = color_at_index(from[0], from[1]);

	if(turn == 'white' && piece_color != 'W') return false;
	else if(turn == 'black' && piece_color != 'B') return false;

	let piece_kind = piece_at_index(from[0], from[1]);

	if(piece_kind == 'P') {
		return check_validity_of_move_pawn(from, to, piece_color);
	}
	else if(piece_kind == 'K') {
		return check_validity_of_move_king(from, to, piece_color);
	}
	else if(piece_kind == 'R') {
		return check_validity_of_move_rook(from, to, piece_color);
	}
	else if(piece_kind == 'N') {
		return check_validity_of_move_knight(from, to, piece_color);
	}
	else if(piece_kind == 'B') {
		return check_validity_of_move_bishop(from, to, piece_color);
	}
	else if(piece_kind == 'Q') {
		return check_validity_of_move_queen(from, to, piece_color);
	}
	return false;
}

function check_validity_of_move_pawn(from, to, piece_color) {
	let dx = to[0] - from[0];
	let dy = to[1] - from[1];

	if(piece_color == 'W') {
		if(dx == 0 && dy == 1 && color_at_index(from[0], from[1] + 1) == 'N') return true;
		else if(dx == 0 && from[1] == 1 && dy == 2 && color_at_index(from[0], from[1] + 1) == 'N' && color_at_index(from[0], from[1] + 2) == 'N') return true;
		else if(((dx == -1 && dy == 1) || (dx == 1 && dy == 1)) && color_at_index(to[0], to[1]) == 'B') return true;
	}
	else if(piece_color == 'B') {
		if(dx == 0 && dy == -1 && color_at_index(from[0], from[1] - 1) == 'N') return true;
		else if(dx == 0 && dy == -2 && from[1] == 6 && color_at_index(from[0], from[1] - 1) == 'N' && color_at_index(from[0], from[1] - 2) == 'N') return true;
		else if(((dx == -1 && dy == -1) || (dx == 1 && dy == -1)) && color_at_index(to[0], to[1]) == 'W') return true;
	}

	return false;
}

function check_validity_of_move_king(from, to, piece_color) {
	let dx = to[0] - from[0];
	let dy = to[1] - from[1];

	if(dx*dx + dy*dy >= 1 && dx*dx + dy*dy <= 2 && color_at_index(to[0], to[1]) != piece_color) return true;

	return false;
}

function check_validity_of_move_rook(from, to, piece_color) {
	let dx = to[0] - from[0];
	let dy = to[1] - from[1];

	if(dx * dy == 0 && color_at_index(to[0], to[1]) != piece_color) {
		// Make sure no pieces block the path
		let min_x = min(from[0], to[0]);
		let max_x = max(from[0], to[0]);
		let min_y = min(from[1], to[1]);
		let max_y = max(from[1], to[1]);

		for(let x = min_x; x <= max_x; x++) {
			for(let y = min_y; y <= max_y; y++) {
				if(x == from[0] && y == from[1]) continue;
				else if(x == to[0] && y == to[1]) continue;

				if(color_at_index(x, y) != 'N') return false;
			}
		}

		return true;
	}
	return false;
}

function check_validity_of_move_knight(from, to, piece_color) {
	let dx = to[0] - from[0];
	let dy = to[1] - from[1];

	if(dx*dx + dy*dy == 5 && color_at_index(to[0], to[1]) != piece_color) return true;
	return false;
}

function check_validity_of_move_bishop(from, to, piece_color) {
	console.log('checking bishop')
	let dx = to[0] - from[0];
	let dy = to[1] - from[1];

	if(dx * dx == dy*dy && color_at_index(to[0], to[1]) != piece_color) {
		// Make sure no pieces block the path
		let step_x = (dx < 0) ? -1 : 1;
		let step_y = (dy < 0) ? -1 : 1;

		let x, y;
		for(x = from[0], y = from[1]; x != to[0]; x += step_x, y += step_y) {
			if(x == from[0] && y == from[1]) continue;
			else if(x == to[0] && y == to[1]) continue;

			if(color_at_index(x, y) != 'N') return false;
		}

		return true;
	}
	return false;
}

function check_validity_of_move_queen(from, to, piece_color) {
	if(check_validity_of_move_rook(from, to, piece_color)) return true;
	if(check_validity_of_move_bishop(from, to, piece_color)) return true;
	return false;
}

function color_at_index(x, y) {
	return board[2*(x + y*8)];
}

function piece_at_index(x, y) {
	return board[2*(x + y*8) + 1];
}

function min(a, b) {
	if(a <= b) return a;
	else return b;
}

function max(a, b) {
	if(a >= b) return a;
	else return b;
}

module.exports.check_validity_of_move = check_validity_of_move