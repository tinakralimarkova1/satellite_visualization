import csv

with open('JMD_satcat.tsv', 'r', newline='', encoding='utf-8') as tsv_file:
    tsv_reader = csv.reader(tsv_file, delimiter='\t')
    
    with open('JMD_satcat.csv', 'w', newline='', encoding='utf-8') as csv_file:
        csv_writer = csv.writer(csv_file)
        csv_writer.writerows(tsv_reader)