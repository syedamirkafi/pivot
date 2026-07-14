import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CVContent } from '../types';

interface ResumePDFProps {
  cvContent?: CVContent;
  content?: string;
  color?: string;
  font?: string;
}

export function ResumePDF({ 
  cvContent, 
  content,
  color = '#A855F7', 
  font = 'Helvetica' 
}: ResumePDFProps) {

  const getPdfFont = (f: string | undefined) => {
    switch (f) {
      case 'Playfair Display': return 'Times-Roman';
      case 'JetBrains Mono': return 'Courier';
      case 'Inter':
      case 'Outfit':
      case 'Poppins':
      case 'Lato':
      default: return 'Helvetica';
    }
  };

  const pdfFont = getPdfFont(font);

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: pdfFont },
    section: { marginBottom: 15 },
    name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: color },
    title: { fontSize: 12, marginBottom: 10, color: '#333' },
    header: { fontSize: 14, fontWeight: 'bold', borderBottom: '1px solid ' + color, marginBottom: 8, marginTop: 10, color: color },
    text: { fontSize: 10, marginBottom: 3 },
    bullet: { fontSize: 10, marginBottom: 2, flexDirection: 'row' },
  });

  if (content) {
    const sections = content.split('##').map(s => s.trim()).filter(s => s.length > 0);
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          {sections.map((section, index) => {
            const [title, ...body] = section.split('\n');
            return (
              <View key={index} style={styles.section}>
                <Text style={styles.header}>{title.toUpperCase()}</Text>
                <Text style={styles.text}>{body.join('\n')}</Text>
              </View>
            );
          })}
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {cvContent && (
          <>
            <View style={styles.section}>
              <Text style={styles.name}>{cvContent.personalInfo.fullName}</Text>
              <Text style={styles.title}>{cvContent.personalInfo.title}</Text>
            </View>
            
            {cvContent.summary && (
              <View style={styles.section}>
                <Text style={styles.header}>SUMMARY</Text>
                <Text style={styles.text}>{cvContent.summary}</Text>
              </View>
            )}

            {cvContent.experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.header}>EXPERIENCE</Text>
                {cvContent.experience.map((exp, i) => (
                  <View key={i} style={styles.section}>
                    <Text style={{fontWeight: 'bold', fontSize: 11}}>{exp.role} | {exp.company}</Text>
                    <Text style={{fontSize: 9, marginBottom: 4}}>{exp.period}</Text>
                    {exp.bullets.map((b, j) => (
                      <Text key={j} style={styles.bullet}>• {b}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </Page>
    </Document>
  );
}
