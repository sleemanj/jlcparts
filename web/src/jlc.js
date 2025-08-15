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
                { data.lossNumber
                    ? <tr>
                        <td className="md:w-2/5">Attrition:</td>
                        <td>{data.lossNumber} pcs</td>
                      </tr>
                    : ""
                }
                { data.leastNumber
                    ? <tr>
                        <td className="md:w-2/5">Minimal order quantity:</td>
                        <td>{data.leastNumber} pcs</td>
                      </tr>
                    : ""
                }
                { (data.componentLibraryType === 'expand' && !data.preferredComponentFlag)
                    ? <React.Fragment>
                          <tr>
                            <th className="md:w-5/5" colSpan="2">Economic PCBA</th>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>$3 USD (Extended Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((3 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <th className="md:w-2/5">Per Piece for {this.props.quantity} pcs:</th>
                            <td><strong>{Math.round(((3 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} per piece</strong></td>
                          </tr>
                          <tr>
                            <th className="md:w-5/5" colSpan="2">Standard PCBA</th>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>$1.50 USD (Extended Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((1.5 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Per Piece for {this.props.quantity} pcs:</td>
                            <td>{Math.round(((1.5 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} per piece</td>
                          </tr>
                      </React.Fragment>
                    : <React.Fragment>
                          <tr>
                            <th className="md:w-5/5" colSpan="2">Economic PCBA</th>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>None (Basic/Preferred Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((3 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <th className="md:w-2/5">Per Piece for {this.props.quantity} pcs:</th>
                            <td><strong>{Math.round(((0 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} per piece</strong></td>
                          </tr>
                          <tr>
                            <th className="md:w-5/5" colSpan="2">Standard PCBA</th>
                          </tr>   
                          <tr>
                            <td className="md:w-2/5">Loading Fee:</td>
                            <td>$1.50 (Basic/Preferred Part)</td>    
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Price for {this.props.quantity} pcs:</td>
                            <td>{Math.round((1.5 + this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                          </tr>
                          <tr>
                            <td className="md:w-2/5">Per Piece for {this.props.quantity} pcs:</td>
                            <td>{Math.round(((1.5 + this.price() + Number.EPSILON)/this.props.quantity) * 1000) / 1000} per piece</td>
                          </tr>
                      </React.Fragment>
                }
                  <tr>
                    <td className="md:w-5/5" colSpan="2">Prices are estimates for Economic PCBA, do not include soldering fees.</td>    
                  </tr>
                </tbody>
            </table>
        return <div className="w-full p-4 text-center">
                <InlineSpinbox/>
            </div>;
    }
}
