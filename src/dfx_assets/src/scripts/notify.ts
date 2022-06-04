import { Notify } from 'quasar';

type MessageType = string | Error | unknown;

type NotifyType = 'negative' | 'info' | 'warning' | 'positive' | 'ongoing';
interface INotifyMoreInfo {
    pre?: string;
    post?: string;
}

const notifyX = (
    type: NotifyType,
    mess: MessageType,
    more?: INotifyMoreInfo,
) => {
    let message = more?.pre || '';
    if (typeof mess === 'string') message += mess;
    else if (mess instanceof Error) message += mess.message;
    else return;

    message += more?.post || '';
    Notify.create({
        type,
        message,
    });
};

export const notifyPos = (mess: MessageType, more?: INotifyMoreInfo) => notifyX('positive', mess, more);
export const notifyOnging = (mess: MessageType, more?: INotifyMoreInfo) => notifyX('ongoing', mess, more);
export const notifyNeg = (mess: MessageType, more?: INotifyMoreInfo) => notifyX('negative', mess, more);
export const notifyInfo = (mess: MessageType, more?: INotifyMoreInfo) => notifyX('info', mess, more);
export const notifyWarning = (mess: MessageType, more?: INotifyMoreInfo) => notifyX('warning', mess, more);
