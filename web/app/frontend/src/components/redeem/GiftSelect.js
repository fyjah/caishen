import { h, Component } from 'preact'
import { formatDate } from "../../dates.js";
import TxSuccess from "./TxSuccess.js";
import PendingTransaction from "../PendingTransaction.js";


class Gift extends Component {
  state = {
    transaction: null,
    hideRedeem: false,
    btnClicked: false,
  };


  handleRedeemBtnClick = () => {
    this.setState({ 
      btnClicked: true,
    }, () => {

      //this.props.caishen.redeem.estimateGas(this.props.gift.id).then(gas => {
        //this.props.caishen.redeem(this.props.gift.id, { gas }).then(tx => {
        
        this.props.caishen.redeem(this.props.gift.id).then(tx => {
          this.setState({
            transaction: { txHash: tx.receipt.transactionHash },
            hideRedeem: true,
            btnClicked: false,
          });
        }).catch(err => {
          this.setState({ btnClicked: false });
        });
      });
    //});
  }


  render(){
    const expiry = this.props.gift.expiry;
    const expiryTimestamp = expiry.getTime();

    const now = parseInt((Date.now() / 1000).toFixed(0), 10);
    const hasExpired = now > expiryTimestamp;

    let giver = (
      <p>
        From: <pre>{this.props.gift.giver}</pre>
      </p>
    );

    if (this.props.gift.giverName.length > 0){
      giver = (
        <div>
          <p>
            Giver's name: {this.props.gift.giverName}
          </p>
          {this.props.gift.message.length > 0 &&
            <p>
              Giver's message: {this.props.gift.message}
            </p>
          }
          <p>
            ETH Address: <pre>{this.props.gift.giver}</pre>
          </p>
        </div>
      );
    }

    const timestamp = formatDate(new Date(this.props.gift.timestamp.toNumber()));

    return (
      <div class="gift">
        <p>Given on: {timestamp}</p>
        <p>Amount: {this.props.gift.amount} ETH</p>
        {giver}
        {this.props.gift.giverName.length === 0 && this.props.gift.message.length > 0 &&
          <p>
            Giver's message: {this.props.gift.message}
          </p>
        }
        <p>Opening date: {formatDate(expiry)}</p>

        {this.state.transaction != null &&
          <TxSuccess 
            label="Gift redeemed."
            transaction={this.state.transaction} />
        }

        <div class="pure-u-md-3-4">
          {!this.state.btnClicked && hasExpired && !this.state.hideRedeem &&
            <button
              class="pure-button button-success"
              onClick={this.handleRedeemBtnClick}>
              Redeem
            </button>

          }
          {this.state.btnClicked && <PendingTransaction /> }
        </div>
      </div>
    );
  }
}

export default class GiftSelect extends Component {
  state = {
    gifts: null,
  };


  componentWillMount = () => {
    this.retriveGiftInfo();
  }

  retriveGiftInfo = () => {
    let gifts = [];
    this.props.caishen.getGiftIdsByRecipient.call(this.props.address).then(giftIds => {
      if (giftIds.length === 0){
        this.setState({ gifts: [] });
      }
      else{
        giftIds.forEach(giftId => {
          this.props.caishen.giftIdToGift(giftId).then(gift => {

            // Only show gifts which exist and have not yet been redeemed
            if (gift[0] && !gift[6]){

              gifts.push({
                id: gift[1].toNumber(),
                giver: gift[2],
                expiry: new Date(gift[4].toNumber()),
                amount: web3.fromWei(gift[5]).toFixed(8),
                giverName: gift[7],
                message: gift[8],
                timestamp: gift[9]
              });

              this.setState({ gifts });
            }
          }).catch(err => {
            this.setState({ gifts: [] });
            console.error(err);
          });
        });
      }
    });
  }


  componentWillReceiveProps = newProps => {
    if (this.props.address !== newProps.address){
      this.setState({ gifts: [] }, this.retriveGiftInfo);
    }
  }


  render() {
    if (this.state.noWeb3 && this.props.renderNoWeb3){
      return this.props.renderNoWeb3();
    }

    if (this.state.gifts == null){
      return (
        <div>
          <p>Loading...</p>
        </div>
      );
    }

    let sortedGifts = this.state.gifts;
    if (this.state.gifts.length === 0){
      return (
        <div>
          <p>You didn't receive any gifts.</p>
        </div>
      );
    }

    sortedGifts.sort((a, b) => {
      const aExpiry = a.expiry.getTime();
      const bExpiry = b.expiry.getTime();
      if (a.giver === b.giver){
        if (aExpiry === bExpiry){
          return a.amount - b.amount;
        }
        else{
          return aExpiry - bExpiry;
        }
      }
      else{
        return a.giver.localeCompare(b.giver);
      }
    });

    return (
      <div class="gift_select">
        {sortedGifts.map(gift => 
          <Gift 
            caishen={this.props.caishen}
            address={this.props.address}
            gift={gift} />
        )}
      </div>
    );
  }
}
