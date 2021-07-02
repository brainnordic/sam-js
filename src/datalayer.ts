export class DataLayer {
  #queueObj: string;
  #data: any;

  constructor(queueObj: string) {
    this.#queueObj = queueObj;
  }

  getData(): any {
    return this.#data
  }

  makeApiProxy() {
    window[this.#queueObj] ||= []
    window[this.#queueObj].push = (args) => this.enqueueAction(args)
  }

  enqueueAction(data: any[]) {
    let callback: () => void | undefined;
    if(data[data.length - 1] instanceof Function) {
      callback = data.pop()
    }
    let that = this
    setTimeout(() => { that.makeAction(data.shift(), data, callback) })
  }

  makeAction(action_name: string, data?: any[], callback?: ()=>void) {
    
  }
 }
