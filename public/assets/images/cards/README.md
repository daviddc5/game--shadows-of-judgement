# Card art

Drop a picture here and point a card at it to replace the placeholder.

1. Save the image as `public/assets/images/cards/<name>.png`.
2. In `src/case/cards.js`, add `art: "<name>"` to that card, for example
   `{ id: "d_warrant", name: "Search Warrant", ..., art: "search-warrant" }`.

The art is the "evidence photo" on a card: 16:9, shown at 146×82 game pixels on a cream mat. Draw at least
640×360; 1280×720 leaves room for a future full-card inspect view. Keep the
subject in the centre and leave a little margin, since the box has a thin
border. Cards without art keep showing their type symbol.
