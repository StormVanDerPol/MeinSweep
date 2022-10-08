function getCartesian(id, size) {
  return { x: id % size, y: Math.floor(id / size) };
}

function getOneDimensional(x, y, size) {
  return x + size * y;
}

class MeinTile {
  hasMine = false;
  neighbouringMines = 0;
  isExplored = false;
  isFlagged = false;

  onUpdate = null;

  constructor(id, field) {
    this.id = id;
    const { x, y } = field.getCartesian(id);

    this.x = x;
    this.y = y;
  }

  placeMine() {
    this.hasMine = true;
  }

  incrementNeighbouringMines() {
    return ++this.neighbouringMines;
  }

  explore() {
    this.isExplored = true;
    this.isChecked = true;

    if (this.onUpdate) this.onUpdate();
  }

  toggleFlag() {
    this.isFlagged = !this.isFlagged;
    if (this.onUpdate) this.onUpdate();
  }
}

/**
 *  ## relevant public API:
 *
 *  - `mf = new MineField();` to initialize.
 *  - `mf.start(size, mineAmount);` starts game. Can also be used to reset the game.
 *  - iterate over `mf.field` to render your tiles, contains a `Map` of `MeinTile` objects
 *  - `mf.discover(idOrCartesian)` to discover the contents of a tile, click bomb, u lose.
 *  - `mf.toggleFlag(idOrCartesian)` to toggle flag
 *
 *  ## game events useful to react to:
 *
 *  - `MeinField.onWin();`
 *  - `MeinField.onLose();`
 *  - `MeinField.onStart();` triggers after starting the game. More often than not you want to do UI stuff at his point. You call mf.start() yourself so it's not super usefull.
 *  - `MeinTile.onUpdate();` triggers when revealing a tile, either through clicking or through other means. Useful for re-rendering specific tiles.
 */

class MeinField {
  size = 0;
  mineAmount = 0;
  field = new Map();
  startTime = Infinity;
  endTime = Infinity;

  onStart = null;
  onWin = null;
  onLose = null;

  gameStates = Object.freeze({
    progress: 0,
    win: 1,
    lose: 2,
  });

  state = this.gameStates.progress;

  start(size, mineAmount) {
    this.startTime = Date.now();
    this.size = size;
    this.mineAmount = mineAmount;

    this.state = this.gameStates.progress;

    this.createField();
    this.populateMines();

    if (this.onStart) this.onStart();
  }

  getCartesian(id) {
    return getCartesian(id, this.size);
  }

  getOneDimensional(x, y) {
    return getOneDimensional(x, y, this.size);
  }

  createField() {
    this.field = new Map();

    for (let i = 0; i < Math.pow(this.size, 2); i++) {
      this.field.set(i, new MeinTile(i, this));
    }
  }

  getNeighbors(id, range = 1) {
    const { x, y } = this.getCartesian(id);

    const neighboringCoordinates = [...new Array(range)].flatMap((_, i) => {
      // we don't need
      i++;

      return [
        { x: x - i, y: y + i },
        { x: x + i, y: y + i },
        { x: x - i, y: y - i },
        { x: x + i, y: y - i },
        { x: x, y: y + i },
        { x: x, y: y - i },
        { x: x - i, y: y },
        { x: x + i, y: y },
      ].filter(
        ({ x: nx, y: ny }) =>
          nx >= 0 && nx < this.size && ny >= 0 && ny < this.size
      );
    });

    return (
      neighboringCoordinates
        .map(({ x, y }) => {
          const nId = this.getOneDimensional(x, y);

          return this.field.get(nId);
        })
        // clear undefined
        .filter((def) => def)
    );
  }

  populateMines() {
    const maxIterationDepth = Math.pow(this.size, 2) * 4;
    let iterationCount = 0;

    let placedMines = 0;

    while (placedMines < this.mineAmount) {
      if (iterationCount > maxIterationDepth)
        throw new Error("Exceeded iteration depth");

      iterationCount++;

      const id = Math.round(Math.pow(this.size, 2) * Math.random());

      const thisTile = this.field.get(id);

      if (!thisTile) continue;
      if (thisTile.hasMine) continue;

      thisTile.placeMine();
      const neighbours = this.getNeighbors(id, 1);

      neighbours.forEach((n) => n.incrementNeighbouringMines());

      placedMines++;
    }
  }

  getTile(idOrCartesian) {
    return this.field.get(
      typeof idOrCartesian === "object"
        ? this.getOneDimensional(idOrCartesian.x, idOrCartesian.y)
        : idOrCartesian
    );
  }

  lose() {
    this.state = this.gameStates.lose;

    this.field.forEach((tile) => tile.hasMine && tile.explore());

    this.endTime = Date.now();

    if (this.onLose) this.onLose();
  }

  win() {
    this.state = this.gameStates.win;

    this.endTime = Date.now();

    if (this.onWin) this.onWin();
  }

  check(id) {
    const tile = this.getTile(id);

    if (tile.isExplored) return;

    tile.explore();

    if (tile.neighbouringMines === 0) {
      const neighbours = this.getNeighbors(tile.id);
      neighbours.forEach((neighbour) => this.check(neighbour.id));
    }
  }

  toggleFlag(idOrCartesian) {
    if (this.state !== this.gameStates.progress) return;

    const tile = this.getTile(idOrCartesian);
    tile.toggleFlag();
  }

  checkWinCondition() {
    const explored = Array.from(this.field.entries()).filter(
      ([, tile]) => tile.isExplored
    ).length;

    const required = Math.pow(this.size, 2) - this.mineAmount;

    return explored === required;
  }

  discover(idOrCartesian) {
    if (this.state !== this.gameStates.progress) return;

    const tile = this.getTile(idOrCartesian);

    if (tile.hasMine) {
      this.lose();
    }

    this.check(tile.id);

    if (this.checkWinCondition()) {
      this.win();
    }
  }
}

export default MeinField;
