// Similarities between strings.

// Source: https://github.com/aceakash/string-similarity/blob/master/src/index.js
// MIT License.

export function compareTwoStrings(first: string, second: string): number {
    first = first.replace(/\s+/g, '');
    second = second.replace(/\s+/g, '');

    if (first === second) return 1; // identical or empty
    if (first.length < 2 || second.length < 2) return 0; // if either is a 0-letter or 1-letter string

    let firstBigrams = new Map<string, number>();
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        firstBigrams.set(bigram, (firstBigrams.get(bigram) ?? 0) + 1);
    };

    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.get(bigram) ?? 0;
        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

// Find best matching values. Limit to N results.
export function findBestMatch(mainString: string, targetStrings: string[], n?: number): string[] {
    const ratings = [];
    for (const s of targetStrings) {
        const rating = compareTwoStrings(mainString, s);
        ratings.push({ target: s, rating: rating });
    }

    // Inefficient to just resort everything instead of keeping a sorted array.
    ratings.sort((r1, r2) => r2.rating - r1.rating);

    return ratings.map(r => r.target).slice(0, n);
}