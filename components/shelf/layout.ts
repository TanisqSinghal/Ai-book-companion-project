import { BOOK_HEIGHT } from '@/components/stage/bookSize';

// Shelf measurements in 3D world units, shared by the page wrapper and the scene
export const SPACING_X = 1.9;
export const ROW_HEIGHT = 2.8;
export const SIDE_MARGIN = 0.5;
export const PLANK_THICKNESS = 0.07;
// Space above each book for it to lift into, and below the plank for its label
const HEADROOM = 0.45;
export const LABEL_DROP = 0.42;
const VERTICAL_PADDING = 0.3;
const MIN_BOOK_SLOT_PX = 230;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 5;

export interface ShelfBook {
    id: string;
    title: string;
    author: string;
    coverURL: string;
    fileURL: string;
    slug: string;
    isPublic?: boolean;
    // The signed-in user uploaded it, so they can edit or delete it
    isOwner?: boolean;
}

export interface ShelfSlot {
    book: ShelfBook;
    index: number;
    x: number;
    y: number;
}

export const columnsForWidth = (widthPx: number) =>
    Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor(widthPx / MIN_BOOK_SLOT_PX)));

export const shelfSize = (bookCount: number, columns: number) => {
    const rows = Math.max(1, Math.ceil(bookCount / columns));

    return {
        rows,
        width: columns * SPACING_X + SIDE_MARGIN * 2,
        height: rows * ROW_HEIGHT + VERTICAL_PADDING,
    };
};

// Where each book and plank sits, with the shelf centred on the origin.
// Rows are centred too, so a part-filled shelf still looks deliberate.
export const layoutShelf = (books: ShelfBook[], columns: number) => {
    const { rows, width, height } = shelfSize(books.length, columns);
    const top = height / 2;
    const plankHeights: number[] = [];
    const slots: ShelfSlot[] = [];

    for (let row = 0; row < rows; row++) {
        const start = row * columns;
        const rowBooks = books.slice(start, start + columns);
        const plankY = top - row * ROW_HEIGHT - HEADROOM - BOOK_HEIGHT - PLANK_THICKNESS;
        plankHeights.push(plankY);

        rowBooks.forEach((book, column) => {
            slots.push({
                book,
                index: start + column,
                x: (column - (rowBooks.length - 1) / 2) * SPACING_X,
                y: plankY + PLANK_THICKNESS / 2 + BOOK_HEIGHT / 2,
            });
        });
    }

    return { width, height, slots, plankHeights };
};
