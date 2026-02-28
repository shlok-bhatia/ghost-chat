function getMessageAge(createdAt: number ) {
    const now= Date.now();
    const age = now - createdAt;  //in ms

    const minutes = Math.floor(age / (1000 * 60));
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(age / (1000 * 60 * 60 * 24));

    if(minutes<1) return `just now`;
    if(minutes<60) return `${minutes} minute${minutes >1 ? "s" : ""} ago`;
    if(hours <24) return `${hours} hour${hours>1 ? "s" : ""} ago`;

    return `${days} day${days > 1 ? "s" : ""} ago`
}

export default getMessageAge;