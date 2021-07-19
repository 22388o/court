import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Card, Col, Row } from "antd";

export default function TopBanner({ description, extra, title, extraLong }) {
  return extraLong ? (
    <StyledCard>
      <StyledTitleRow align="middle" type="flex">
        <StyledTitleCol md={4} xs={12}>
          {title}
        </StyledTitleCol>
        <Col md={10} xs={0}>
          {description}
        </Col>
        <StyledExtraCol md={10} xs={12}>
          {extra}
        </StyledExtraCol>
      </StyledTitleRow>
    </StyledCard>
  ) : (
    <StyledCard>
      <StyledTitleRow type="flex">
        <div>
          <StyledTitleCol>{title}</StyledTitleCol>
          <StyledDescriptionCol>{description}</StyledDescriptionCol>
        </div>
        <StyledExtraCol>{extra}</StyledExtraCol>
      </StyledTitleRow>
    </StyledCard>
  );
}

TopBanner.propTypes = {
  description: t.node,
  extra: t.node,
  title: t.string.isRequired,
  extraLong: t.bool,
};

TopBanner.defaultProps = {
  description: null,
  extra: null,
  extraLong: false,
};

const StyledCard = styled(Card)`
  background: linear-gradient(270deg, #f2e3ff 22.92%, #ffffff 76.25%);
  box-shadow: 0px 18px 24px -6px rgba(188, 156, 255, 0.4);
  color: #4d00b4;
  margin: 0 -9.375vw 28px -9.375vw;
  min-height: 88px;
  padding: 0px 9.375vw;

  .ant-card-body {
    padding: 24px 0;
  }
`;

const StyledDescriptionCol = styled(Col)`
  margin-bottom: 8px;

  @media (max-width: 640px) {
    display: none;
  }
`;

const StyledTitleCol = styled(Col)`
  font-size: 24px;
  font-weight: bold;
`;
const StyledExtraCol = styled(Col)`
  align-items: center;
  display: flex;
  flex-direction: row;
  grid-gap: 8px 0;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const StyledTitleRow = styled(Row)`
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin: 0;
`;
