<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xs="http://www.w3.org/2001/XMLSchema">

  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:param name="lang" select="'en'"/>
  <xsl:param name="showDetails" select="true()"/>

  <xsl:variable name="title" select="'Book Catalogue'"/>
  <xsl:variable name="maxItems" select="100"/>

  <!-- Main entry point: transform root to HTML page -->
  <xsl:template match="/">
    <html lang="{$lang}">
      <head>
        <title><xsl:value-of select="$title"/></title>
      </head>
      <body>
        <h1><xsl:value-of select="$title"/></h1>
        <xsl:apply-templates select="catalogue/book"/>
      </body>
    </html>
  </xsl:template>

  <!-- Match each book element -->
  <xsl:template match="book">
    <div class="book">
      <xsl:call-template name="book-header"/>
      <xsl:if test="$showDetails">
        <p><xsl:value-of select="description"/></p>
      </xsl:if>
      <xsl:choose>
        <xsl:when test="@available = 'true'">
          <span class="available">In stock</span>
        </xsl:when>
        <xsl:otherwise>
          <span class="unavailable">Out of stock</span>
        </xsl:otherwise>
      </xsl:choose>
    </div>
  </xsl:template>

  <!-- Named template: render book header -->
  <xsl:template name="book-header">
    <h2><xsl:value-of select="title"/></h2>
    <p>By <xsl:value-of select="author"/> — <xsl:value-of select="year"/></p>
    <ul>
      <xsl:for-each select="tags/tag">
        <li><xsl:value-of select="."/></li>
      </xsl:for-each>
    </ul>
  </xsl:template>

  <!-- Named template: format price -->
  <xsl:template name="format-price">
    <xsl:param name="amount"/>
    <xsl:param name="currency" select="'USD'"/>
    <span class="price">
      <xsl:value-of select="$currency"/>
      <xsl:text> </xsl:text>
      <xsl:value-of select="format-number($amount, '#,##0.00')"/>
    </span>
  </xsl:template>

</xsl:stylesheet>
