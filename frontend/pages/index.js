import {
  GeniusDevsDAOABI,
  GeniusDevsDAOAddress,
  GeniusDevsNFTABI,
  GeniusDevsNFTAddress,
} from "@/constants";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Head from "next/head";
import { useEffect, useState } from "react";
import { formatEther } from "viem/utils";
import { useAccount, useBalance, useContractRead } from "wagmi";
import { readContract, waitForTransaction, writeContract } from "wagmi/actions";
import styles from "../styles/Home.module.css";
import { Inter } from "next/font/google";

const inter = Inter(
  {
    subsets: ["latin"],
    display: "swap",
  }
);

export default function Home() {
  //here we check if user wallet is connected and address using Wagmi hooks.
  const { address, isConnected } = useAccount();
  //implementing a space variable to know if the component has been mounted
  const [isMounted, setIsMounted ] = useState(false);
  //implementing a state variable to show loading state when waiting for transaction to finish
  const [loading, setLoading] = useState(false);
  //NFT token to purchase, will be used when creating proposals
  const [fakeNftTokenId, setFakeNftTokenId] = useState("");
  //implementing a state variable to store all proposals in the DAO
  const [proposals, setProposals] = useState([]);
  //implementing a state variable to switch between the 'Create Proposal' and 'View Proposals' tabs
  const [selectedTab, setSelectedTab] = useState("");

  //fetch DAO owner
  const daoOwner = useContractRead({abi: GeniusDevsDAOABI, address: GeniusDevsDAOAddress, functionName: "owner",});
  
  //fetch DAO balance
  const daoBalance = useBalance({
    address:GeniusDevsDAOAddress,
  });

  //fetch current number of proposals in the DAO
  const numOfProposalsInDAO = useContractRead({
    abi: GeniusDevsDAOABI, address: GeniusDevsDAOAddress, functionName: "numProposals",
  });
  console.log("numOfProposalsInDAO", numOfProposalsInDAO);
  //fetch the GeniusDevs NFT balance of the user
  const nftBalanceOfUser = useContractRead({
    abi: GeniusDevsNFTABI, address: GeniusDevsNFTAddress, functionName: "balanceOf", args: [address],
  });

  //this function implements a createProposal transaction in the DAO
  async function createProposal() {
    setLoading(true);

    try{
      const tx = await writeContract({
        address: GeniusDevsDAOAddress,
        abi: GeniusDevsDAOABI,
        functionName: "createProposal",
        args: [fakeNftTokenId],
      });

      await waitForTransaction(tx);
      const receipt = await waitForTransaction(tx);
      if (receipt.status === 1) {
        alert('Proposal created successfully');
      } else {
        alert('Proposal creation failed. Please check the transaction on the blockchain.');
      }
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  //this function fetches proposal using its ID
  async function fetchProposalById(id) {
    try {
      const proposal = await readContract({
        address: GeniusDevsDAOAddress,
        abi: GeniusDevsDAOABI,
        functionName: "proposals",
        args: [id],
      });

      const [nftTokenId, deadline, yayVotes, nayVotes, executed] = proposal;
      const parsedProposal = {
        proposalId: id,
        nftTokenId: nftTokenId.toString(),
        deadline: new Date(parseInt(deadline.toString())*1000),
        yayVotes: yayVotes.toString(),
        nayVotes: nayVotes.toString(),
        executed: Boolean(executed),
      };

      return parsedProposal;
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
  }

  //function to fetch all DAO proposals 
  async function fetchAllProposals() {
    try {
      const proposals = [];
      if (numOfProposalsInDAO.data !== undefined) {
      for (let i = 0; i < numOfProposalsInDAO.data;i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      }}

      setProposals(proposals);
      return proposals;
    } catch (error) {
      console.error (error);
      window.alert(error);
    }
  }

  //function to vote on proposal
  async function voteForProposal(proposalId, vote) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: GeniusDevsDAOAddress,
        abi: GeniusDevsDAOABI,
        functionName: "VoteOnProposal",
        args: [proposalId, vote === "YAY" ? 0:1],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  //this function executes proposal after deadline has passed
  async function executeProposal(proposalId) {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: GeniusDevsDAOAddress,
        abi: GeniusDevsDAOABI,
        functionName: "executeProposal",
        args: [proposalId],
      });

      await waitForTransaction(tx);
    } catch (error) {
      console.error(error);
      window.alert(error);
    }
    setLoading(false);
  }

  //this function withdraws ether from the DAO contract
  async function withdrawDAOEther() {
    setLoading(true);
    try {
      const tx = await writeContract({
        address: GeniusDevsDAOAddress,
        abi: GeniusDevsDAOABI,
        functionName: "withdrawEther",
        args: [],
      });
      await waitForTransaction(tx);
    } catch (error){
      console.log(error);
      window.alert(error);
    }
    setLoading(false);
  }
  //this renders contents of each tab based on 'selecetedTabs'
  function renderTabs(){
    if (selectedTab === "Create Proposal"){
      return renderCreateProposalTab();
    } else if ( selectedTab === "View Proposals"){
      return renderViewProposalsTab();
    }
    return null;
  }

  //this renders the 'Create Proposal' tab content
  function renderCreateProposalTab() {
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction.
        </div>
      );
    }else if (nftBalanceOfUser.data === 0){
      return (
        <div className={styles.description}>
          You do not own any GeniusDevs NFTs. <br />
          <b>You cannot create or vote on proposals.</b>
        </div>
      );
    }else {
      return (
        <div className={styles.container}>
          <label>NFT Token ID to purchase: </label>
          <input 
          placeholder="0"
          type="number"
          onChange={(e)=>setFakeNftTokenId(e.target.value)}/>
          <button className={styles.button2} onClick={createProposal}>
            Create
          </button>
        </div>
      );
    }
  }

  //this renders the 'View Proposals' tab content
  function renderViewProposalsTab(){
    if (loading) {
      return (
        <div className={styles.description}>
          Loading... Waiting for transaction.
        </div>
      );
    } else if (proposals.length === 0) {
      return ( 
      <div className={styles.description}>
        There are currently zero proposals 
      </div>);
    }else {
      return (
        <div>
          {proposals.map((p,index)=>(
            <div key={index} className={styles.card}>
              <p>Proposal ID: {p.proposalId}</p>
              <p>NFT to Purchase: {p.nftTokenId}</p>
              <p>Deadline: {p.deadline.toLocaleString()}</p>
              <p>Yay Votes: {p.yayVotes}</p>
              <p>Nay Votes: {p.nayVotes}</p>
              <p>Executed?: {p.executed.toString()}</p>
              {p.deadline.getTime()>Date.now()&&!p.executed?(
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={()=> voteForProposal(p.proposalId, "YAY")}>
                      Vote YAY
                  </button>
                  <button
                    className={styles.button2}
                    onClick={()=>voteForProposal(p.proposalId, "NAY")}>
                      Vote NAY	
                  </button>
                </div>
              ) : p.deadline.getTime()<Date.now() && !p.executed?(
                <div className={styles.flex}>
                  <button
                    className={styles.button2}
                    onClick={()=>executeProposal(p.proposalId)}>
                      Execute Proposal{" "}
                      {p.yayVotes>p.nayVotes?"(YAY)":"(NAY)"}
                    </button>
                  </div>
              ):(<div className={styles.description}>Proposal Executed</div>)}
              </div>
              )
              )}</div>
          );
    }
  }

  //thsi runs every time value of 'selectedTab' changes
  //Used to re-fetch all proposals in the DAO when user switches to the 'View Proposals' tab
  useEffect(()=>{
    if (selectedTab === "View Proposals"){
      fetchAllProposals();
    } 
  }, [selectedTab]);
  useEffect(()=>{
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  if (!isConnected)
    return (<div className={styles.contain}>
      <ConnectButton/>
    </div>);
  return (
    <div className={inter.className}>
      <Head>
        <title>
          GeniusDevs DAO
        </title>
        <meta name="description" content="GeniusDevs DAO" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Genius Devs!</h1>
          <div className={styles.description}>Welcome to the DAO!</div>
          <div className={styles.description}>
            Your GeniusDevs NFT Balance: {nftBalanceOfUser.data?.toString()}
            <br />{daoBalance.data && (
            <>
              Treasury Balance: {" "}
              {formatEther(daoBalance.data.value).toString()} ETH
            </>)}
            <br />
            Total Number of Proposals:{numOfProposalsInDAO && numOfProposalsInDAO?.data?.toString()}
          </div>
          <div className={styles.flex}>
            <button
              className={styles.button}
              onClick={()=>setSelectedTab("Create Proposal")}>Create Proposal
            </button>
            <button
            className={styles.button}
            onClick={()=> setSelectedTab("View Proposals")}>View Proposals
            </button>
          </div>
          {renderTabs()}
          {/*Display additional withdraw button if the connected wallet belongs to the DAO owner*/}
          {address && daoOwner?.data && address.toLowerCase() ===daoOwner?.data?.toLowerCase()?(
            <div>
              {loading?(
                <button className={styles.button} disabled>Loading</button>
              ):(
                <button className={styles.button} onClick={withdrawDAOEther}>Withdraw from DAO</button>
              )}
        </div>
          ):(
            ""
          )}
      </div>
      {/* <div>
        <img className={styles.image} src="https://i.imgur.com/buNhbF7.png" />
      </div> */}
    </div >
  </div>
  );
}