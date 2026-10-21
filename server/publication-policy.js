export const FREE_PUBLICATION_HOURS=24;
export function approvalWindow(time=new Date()) {
 return {approvedAt:time.toISOString(),expiresAt:new Date(time.getTime()+FREE_PUBLICATION_HOURS*3600000).toISOString(),publicationPlan:'free'};
}
export function hasExpired(item,time=new Date()) {
 return item.status==='approved'&&!!item.expiresAt&&Date.parse(item.expiresAt)<=time.getTime();
}
