import { Card, Col, Row } from 'antd'
import ETHAddress from './eth-address'
import ETHAmount from './eth-amount'
import Identicon from '../components/identicon'
import React from 'react'
import { ReactComponent as SectionArrow } from '../assets/images/section-arrow.svg'
import { ReactComponent as SectionArrowBackground } from '../assets/images/section-arrow-background.svg'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const StyledCard = styled(Card)`
  height: 136px;
  margin: 28px 0;

  .ant-card-body {
    padding: 18px 36px;
  }
`
const StyledDiv = styled.div`
  font-weight: bold;
  margin: 8px 0;
`
const StyledSectionArrow = styled(SectionArrow)`
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
`
const StyledTopDiv = styled.div`
  font-weight: medium;
`
const StyledCenterDiv = styled.div`
  font-size: 36px;
  font-weight: bold;
`
const StyledBottomDiv = styled.div`
  font-size: 18px;
  font-weight: bold;
`
const StyledCol = styled(Col)`
  z-index: 0;
`
const StyledSectionArrowBackground = styled(SectionArrowBackground)`
  height: 134px;
  position: absolute;
  right: -37px;
  top: -18px;
  z-index: -1;
`
const PNKBalanceCard = () => {
  const { cacheCall, drizzleState } = useDrizzle()
  return (
    <StyledCard hoverable>
      <Row>
        <Col span={8}>
          <Row>
            <Col span={10}>
              <Identicon large />
            </Col>
            <Col span={14}>
              <StyledDiv>
                <ETHAddress address={drizzleState.accounts[0]} />
              </StyledDiv>
              <StyledDiv>
                <ETHAmount
                  amount={cacheCall(
                    'MiniMeTokenERC20',
                    'balanceOf',
                    drizzleState.accounts[0]
                  )}
                />{' '}
                PNK
              </StyledDiv>
              <StyledDiv>
                <ETHAmount
                  amount={
                    drizzleState.accountBalances[drizzleState.accounts[0]]
                  }
                />{' '}
                ETH
              </StyledDiv>
            </Col>
          </Row>
          <StyledSectionArrow className="ternary" />
        </Col>
        <Col className="ternary theme-color" span={8}>
          <StyledTopDiv>You have</StyledTopDiv>
          <StyledCenterDiv>500 PNK</StyledCenterDiv>
          <StyledBottomDiv>Staked</StyledBottomDiv>
        </Col>
        <StyledCol className="ternary theme-color" span={8}>
          <StyledTopDiv>You have</StyledTopDiv>
          <StyledCenterDiv>100 PNK</StyledCenterDiv>
          <StyledBottomDiv>Locked</StyledBottomDiv>
          <StyledSectionArrowBackground />
        </StyledCol>
      </Row>
    </StyledCard>
  )
}

PNKBalanceCard.propTypes = {}

export default PNKBalanceCard
