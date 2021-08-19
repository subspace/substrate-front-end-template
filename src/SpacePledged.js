import React, { useEffect, useState } from 'react';
import { Statistic, Grid, Card } from 'semantic-ui-react';

import { useSubstrate } from './substrate-lib';

const MAX_U64 = (2n ** 64n) - 1n;
// TODO: Ideally fetch from blockchain itself
const SLOT_PROBABILITY = [1n, 6n];
const PIECE_SIZE = 4096n;
const TB = 1024 * 1024 * 1024 * 1024;
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

function Main (props) {
  const { api } = useSubstrate();
  const [spacePledged, setSpacePledged] = useState(0);

  const bestNumber = api.derive.chain.bestNumber;
  const subscribeNewBlocks = api.derive.chain.subscribeNewBlocks;

  useEffect(() => {
    let unsubscribeAll = null;

    subscribeNewBlocks(block => {
      for (const log of block.block.header.digest.logs) {
        if (log.isConsensus) {
          const [type, data] = log.asConsensus;
          if (type.toString() === 'POC_') {
            const consensusLog = api.registry.createType('PocConsensusLog', data);
            switch (true) {
              case consensusLog.isSolutionRangeData: {
                const solutionRange = consensusLog.asSolutionRangeData.solutionRange.toBigInt();
                const estimatedSpace = Number(
                  MAX_U64 * SLOT_PROBABILITY[0] / SLOT_PROBABILITY[1] / solutionRange * PIECE_SIZE
                );
                if (estimatedSpace >= TB) {
                  setSpacePledged(`${Math.round(estimatedSpace * 100 / TB ) / 100} TB`);
                } else if (estimatedSpace >= GB) {
                  setSpacePledged(`${Math.round(estimatedSpace * 100 / GB ) / 100} GB`);
                } else {
                  setSpacePledged(`${Math.round(estimatedSpace * 100 / MB ) / 100} MB`);
                }
                break;
              }
            }
          }
        }
      }
    })
      .then(unsub => {
        unsubscribeAll = unsub;
      })
      .catch(console.error);

    return () => unsubscribeAll && unsubscribeAll();
  }, [subscribeNewBlocks]);

  useEffect(() => {
    return () => clearInterval(id);
  }, []);

  return (
    <Grid.Column>
      <Card>
        <Card.Content textAlign='center'>
          <Statistic
            label="Space pledged on the network"
            value={spacePledged}
          />
        </Card.Content>
      </Card>
    </Grid.Column>
  );
}

export default function SpacePledged (props) {
  const { api } = useSubstrate();
  return api.derive &&
    api.derive.chain &&
    api.derive.chain.bestNumber
    ? <Main {...props} />
    : null;
}
