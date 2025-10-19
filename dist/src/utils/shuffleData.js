export const shuffleData = (data, count) => {
    const shuffle = [...data];
    for (let index = shuffle.length - 1; index > 0; index--) {
        const j = Math.floor(Math.random() * (index + 1));
        [shuffle[index], shuffle[j]] = [shuffle[j], shuffle[index]];
    }
    return shuffle.slice(0, count);
};
