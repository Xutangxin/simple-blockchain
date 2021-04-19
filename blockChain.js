const sha256 = require('js-sha256');//导入sha256方法
const ecLib = require('elliptic').ec;
const ec = new ecLib('secp256k1')
//区块内容：1.自己的data 2.之前区块的哈希值 3.自己的哈希值-sha256（data+之前区块哈希值）
//区块
class Block {
    constructor(transactions, previousHash) {
        // this.data = data;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.timestamp = Date.now();//时间戳
        this.nonce = 1;//改变hash的变量
        this.hash = this.computeHash();
    }

    computeHash() {
        return sha256(JSON.stringify(this.transactions) + this.previousHash + this.nonce + this.timestamp);
    }

    getAnswer(difficulty) {//设置符合条件的hash开头0的个数
        let answer = '';
        for (let i = 0; i < difficulty; i++) {
            answer += '0';
        }
        return answer;
    }

    //计算符合区块要求难度的hash（挖矿/工作量证明）
    mine(difficulty) {
        this.validBlockTransactions();
        while (true) {
            this.hash = this.computeHash();
            if (this.hash.substr(0, difficulty) !== this.getAnswer(difficulty)) {//不符合条件继续计算
                this.nonce++;
                this.hash = this.computeHash();
            } else {
                break;
            }
        }
        console.log('挖矿结束', this.hash);
    }

    //判断transaction是否合法
    validBlockTransactions() {
        for (let transaction of this.transactions) {
            if (!transaction.isValid()) {
                console.log('invalid transaction found in transactions');
                return false;
            }
        }
        return true;
    }
}

//交易记录
class Transaction {
    constructor(from, to, amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }
    computeHash() {
        return sha256(this.from + this.to + this.amount);
    }

    //生成数字签名
    sign(key) {
        this.signature = key.sign(this.computeHash(), 'base64').toDER('hex');
    }

    //判断签名是否合法
    isValid() {
        if (this.from === '') return true;
        let keyObj = ec.keyFromPublic(this.from, 'hex');
        return keyObj.verify(this.computeHash(), this.signature);
    }
}

//链
class Chain {
    constructor() {
        this.chain = [this.genesisBlock()];
        this.transactionPool = [];//交易池
        this.minerReward = 50;//挖矿奖励
        this.difficulty = 4;//设置难度,0的位数
    }

    genesisBlock() {//生成祖先区块
        let genesisBlock = new Block('我是祖先区块', null);
        return genesisBlock;
    }

    getLatestBlock() {//获取最近一个区块
        return this.chain[this.chain.length - 1];
    }

    //添加transaction到transactionPool里
    addTransaction(transaction) {
        if (!transaction.isValid()) {
            throw new Error('invalid transaction');
        }
        // console.log('valid transaction');
        this.transactionPool.push(transaction);

    }

    addBlockToChain(newBlock) {//添加新区块到链上
        newBlock.previousHash = this.getLatestBlock().hash;
        // newBlock.hash = newBlock.computeHash();
        newBlock.mine(this.difficulty);
        this.chain.push(newBlock);
    }

    //
    mineTransactionPool(minerRewardAddress) {//参数是矿工地址
        //发送矿工奖励
        let minerRewardTransaction = new Transaction('', minerRewardAddress, this.minerReward);
        this.transactionPool.push(minerRewardTransaction);
        //挖矿（创建符合条件的新区块）
        let newBlock = new Block(this.transactionPool, this.getLatestBlock().hash);
        newBlock.mine(this.difficulty);
        //添加区块到区块链，清空交易池
        this.chain.push(newBlock);
        // this.transactionPool = [];
    }

    //验证当前区块是否合法
    //区块数据有没有被篡改
    //当前区块的previousHash是否等于上一个区块的hash
    validateChain() {
        //验证祖先区块，数据是否被篡改
        if (this.chain.length === 1) {
            return this.chain[0].hash === this.chain[0].computeHash();
        }
        //从第二个区块开始验证
        for (let i = 1; i < this.chain.length; i++) {
            let currBlock = this.chain[i];//当前区块
            let previousBlock = this.chain[i - 1];//上一个区块
            if (!currBlock.validBlockTransactions()) {
                console.log('发现非法交易');
                return false;
            }
            //验证当前区块有没有被篡改
            if (currBlock.hash !== currBlock.computeHash()) {
                console.log('数据篡改！');
                return false;
            }
            //验证当前区块的previousHash是否等于上一个区块的hash
            if (currBlock.previousHash !== previousBlock.hash) {
                console.log('前后区块链接断裂！');
                return false;
            }

        }
        return true;
    }

}


let chain = new Chain();
let keyPairSender = ec.genKeyPair();//发起转账方
let privateKeySender = keyPairSender.getPrivate('hex');
let publicKeySender = keyPairSender.getPublic('hex');
let keyPairReceiver = ec.genKeyPair();//接受转账方
let privateKeyReceiver = keyPairReceiver.getPrivate('hex');
let publicKeyReceiver = keyPairReceiver.getPublic('hex');

let t1 = new Transaction(publicKeySender, publicKeyReceiver, 5);//新建一个交易记录
let t2 = new Transaction('jake', 'tom', 20);
t1.sign(keyPairSender);//交易记录签名
console.log(t1);
// console.log(t1.isValid());
console.log('----------------------------------------------');
// t1.amount = 999;
// let t2 = new Transaction('add2', 'add1', 10);
chain.addTransaction(t1);//把交易记录添加到交易池里
// chain.addTransaction(t2);
chain.mineTransactionPool(publicKeyReceiver);
// chain.mineTransactionPool('add4');
console.log(chain);
