import React from "react";
import { InlineSpinbox } from "./componentTable.js"

export function getQuantityPrice(quantity, pricelist) {
    return pricelist.find(pricepoint =>
        quantity >= pricepoint.qFrom && (quantity <= pricepoint.qTo || !pricepoint.qTo)
    )?.price ?? pricelist[0]?.price;
}

export class AttritionInfo extends React.Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.state = {}
    }

    componentDidMount() {
        fetch("https://sparks.gogo.co.nz/jlc/details-by-part.php?partNumber="+this.props.component.lcsc, { })
        .then(response => {
            if (!response.ok || response.status !== 200) {
                throw new Error(`Cannot fetch ${this.props.component.lcsc}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(({data}) => {
            this.setState({data});
        })
        .catch(error => {
            this.setState({error: true, errorMessage: error.toString()});
            console.log(error);
        });
    }

    price() {
        let q = Math.max(parseInt(this.props.quantity) + parseInt(this.state.data.lossNumber),
            this.state.data.leastNumber);
        return q * getQuantityPrice(q, this.props.component.price);
    }

    render() {
        let data = this.state.data;
        if (this.state.error) {
            return <div className="bg-yellow-400 p-2 mt-2">
                Cannot fetch attrition data from JLC website: {this.state.errorMessage}.
            </div>
        }
        if (data)
            return <table className="w-full">
                <tbody>
                    <tr className="border-b-2 font-bold">
                       <td className="md:w-5/5 pt-4" colSpan="2">Minimums</td>
                    </tr>   
                    <tr>
                      <td className="md:w-2/5">Minimum Order Quantity:</td>
                      <td>{data.leastNumber?data.leastNumber:0} pcs</td>
                    </tr>
                    <tr>
                      <td className="md:w-2/5">Attrition:</td>
                      <td>{data.lossNumber?data.lossNumber:0} pcs</td>
                    </tr>
                { (data.componentLibraryType === 'expand' && !data.preferredComponentFlag)
                    ? <React.Fragment>
                          <tr className="border-b-2 font-bold">
                            <td className="md:w-5/5 pt-4" colSpan="2">Economic PCBA</td>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>3.00 USD (Extended Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((3 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5 font-bold">Total Per Piece for {this.props.quantity} pcs:</td>
                            <td><strong>{Math.round(((3 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} USD</strong></td>
                          </tr>
                          <tr className="border-b-2 font-bold">
                            <td className="md:w-5/5 pt-4" colSpan="2">Standard PCBA</td>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>1.50 USD (Extended Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((1.5 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Per Piece for {this.props.quantity} pcs:</td>
                            <td>{Math.round(((1.5 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} USD</td>
                          </tr>
                      </React.Fragment>
                    : <React.Fragment>
                          <tr className="border-b-2 font-bold">
                            <td className="md:w-5/5 pt-4" colSpan="2">Economic PCBA</td>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>None (Basic/Preferred Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((3 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5 font-bold">Total Per Piece for {this.props.quantity} pcs:</td>
                            <td><strong>{Math.round(((0 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} USD</strong></td>
                          </tr>
                          <tr className="border-b-2 font-bold">
                            <td className="md:w-5/5 pt-4" colSpan="2">Standard PCBA</td>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>1.50 (Basic/Preferred Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((1.5 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Total Per Piece for {this.props.quantity} pcs:</td>
                            <td>{Math.round(((1.5 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} USD</td>
                          </tr>
                      </React.Fragment>
                }
                  <tr>
                    <td className="md:w-5/5 border-2 pt-4" colSpan="2">
                       <p><small>Prices do not include soldering fees, subject to change.</small></p>
                       <p><small>Total = max( Qty+Attrition, MinimumOrderQty ) * UnitPrice + LoadingFee</small></p>
                    </td>    
                  </tr>
                </tbody>
            </table>
        return <div className="w-full p-4 text-center">
                <InlineSpinbox/>
            </div>;
    }
}
