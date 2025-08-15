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
                        <td className="w-1 whitespace-no-wrap">Attrition:</td>
                        <td className="px-2">{data.lossNumber} pcs</td>
                      </tr>
                    : ""
                }
                { data.leastNumber
                    ? <tr>
                        <td className="w-1 whitespace-no-wrap">Minimal order quantity:</td>
                        <td className="px-2">{data.leastNumber} pcs</td>
                      </tr>
                    : ""
                }
                <tr>
                    <td className="w-1 whitespace-no-wrap">Price for {this.props.quantity} pcs:</td>
                    <td className="px-2">{Math.round((this.price() + Number.EPSILON) * 1000) / 1000} USD</td>
                </tr>

                { (data.componentLibraryType === 'expand' && !data.preferredComponentFlag)
                    ? <tr>
                        <td className="w-1 whitespace-no-wrap">Loading Fee</td>
                        <td className="px-2">$3 USD (Extended Part)</td>    
                      </tr>
                      <tr>
                        <td className="w-1 whitespace-no-wrap">Amortised Cost {this.props.quantity} pcs:</td>
                        <td className="px-2">{Math.round((((this.price() + Number.EPSILON) + 3)/this.props.quantity) * 1000) / 1000} per piece</td>
                      </tr>
                    : <tr>
                        <td className="w-1 whitespace-no-wrap">Loading Fee</td>
                        <td className="px-2">None (Basic Part)</td>    
                      </tr>
                      <tr>
                        <td className="w-1 whitespace-no-wrap">Amortised Cost {this.props.quantity} pcs:</td>
                        <td className="px-2">{Math.round((((this.price() + Number.EPSILON) + 0)/this.props.quantity) * 1000) / 1000}  per piece</td>
                      </tr>
                }
                  <tr>
                    <td className="w-1 whitespace-no-wrap"></td>
                    <td className="px-2">Prices are estimates, do not include per-joint fees.</td>    
                  </tr>
                </tbody>
            </table>
        return <div className="w-full p-4 text-center">
                <InlineSpinbox/>
            </div>;
    }
}
