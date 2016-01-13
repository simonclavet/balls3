
Players = new Mongo.Collection("Players");

Balls = new Mongo.Collection("Balls");

BallStates = new Mongo.Collection("BallStates");

Worlds = new Mongo.Collection("Worlds");


if (!Number.prototype[Symbol.iterator]) {
	Number.prototype[Symbol.iterator] = function(inc){
		var i, done = false, top = +this;
		
		// iterate positively or negatively?
		inc = Math.abs(Number(inc) || 1) * (top < 0 ? -1 : 1);
		
		if(top > 0) top -= 1;		

		return {
			// make the iterator itself an iterable!
			[Symbol.iterator]: function(){ return this; },
	
			next: function(step) {
				// increment by `step` (default: 1)
				step = Math.abs(Number(step) || 1);
				
				if (!done) {
					// initial iteration always 0
					if (i == null) {
						i = 0;
					}
					// iterating positively
					else if (top >= 0) {
						i = Math.min(top,i + (inc * step));
					}
					// iterating negatively
					else {
						i = Math.max(top,i + (inc * step));
					}
					
					// done after this iteration?
					if (i == top) done = true;
	
					return { value: i, done: false };
				}
				else {
					return { done: true };
				}
			}
		};        
	};
}

randomInRange = function(min, max){
	return min + Math.random()*(max - min);
};

randomColor = function () {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return 0xff0000;//color;
}


