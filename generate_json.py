# -*- coding: utf-8 -*-
'''
Created on 01/06/2011
@author: Guillermo Garrido (elguillelmo@gmail.com)
Requires Python >= 2.7.*
'''
# Copyright Guillermo Garrido 2011.
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU Lesser General Public
# License as published by the Free Software Foundation; either
# version 2.1 of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# Lesser General Public License for more details.
#
# You can receive a copy of the GNU Lesser General Public License from 
# http://www.gnu.org/
import sys
import getopt
import json
from collections import OrderedDict
import math

ROOT = "#AcampadaSol"
ROOT_NODE = {"color":"orange", "shape":"dot", "alpha":1, "mass":100}
SEC_NODE = {"color":"lightblue", "shape":"dot", "alpha":1, "radius":60, "mass":10}
SUBSEC_NODE = {"color":"lightgreen", "alpha":0, "mass":1}
SEC_EDGE = {"length":.8}
SUBSEC_EDGE = {"length":1}


def usage():
    print '''Generates a json file for the arbor graph library from a simple
      text format.
      
      Usage: python generate_json.py -i inputfile
      
      inputfile: input file.
      
      outputfile: file to output to; if not provided, use stdout.
    
      '''


def to_unicode_or_bust(obj, encoding='utf-8'):
  ''' From http://farmdev.com/talks/unicode/ 
  Unicode encoding.'''
  if isinstance(obj, basestring):
    if not isinstance(obj, unicode):
      obj = unicode(obj, encoding)
  return obj

def main(args):
  input_file = None
  output_file = None
  
  try:
    opts, args = getopt.getopt(args, "i:o:")

  except getopt.GetoptError:
    usage()
    sys.exit(2)

  for opt, arg in opts:
    if opt == '-i': input_file = arg
    elif opt == '-o': output_file = arg

  if input_file is None:
      usage()
      sys.exit(2)

  input = open(input_file, 'r')

  if output_file is not None:
    output = open(output_file, 'w')
  else:
    output = sys.stdout

  section = None
  subsection = None
  # use Ordered Dictionaries to keep the input ordering in json output.
  graph = OrderedDict([("nodes", OrderedDict()), ("edges", OrderedDict())])

  graph["nodes"][ROOT] = ROOT_NODE.copy()
  graph["edges"][ROOT] = {}
  sections = []
  
  for line in input:
    print line
    # Skip comments.
    if line.startswith('#'): continue
    if line[0:2] == '**':
        if section is None:
          raise Exception("Wrong input format.")
        else:
          parts = line[2:].strip().split('\t')
          subsection = to_unicode_or_bust(parts[0].strip())
          graph["nodes"][subsection] = SUBSEC_NODE.copy()
          if len(parts) > 1:
            url = parts[1]
            graph["nodes"][subsection]["link"] = url
            print graph["nodes"][subsection]["link"]
          if section in graph["edges"]:
            graph["edges"][section][subsection] = SUBSEC_EDGE.copy()
          else:
            graph["edges"][section] = {subsection : SUBSEC_EDGE.copy() }
    elif line[0] == "*":
      if not line.startswith('**'):
        # Section line.
        parts = line[1:].strip().split('\t')
        section = to_unicode_or_bust(parts[0])
        graph["nodes"][section] = SEC_NODE.copy()
        sections.append(section)
        if len(parts) > 1:
            url = parts[1]
            print url
            graph["nodes"][section]["link"] = url
        graph["edges"][ROOT][section] = SEC_EDGE.copy()
    else:
        raise Exception("Wrong input format.")
  
  
  for section in sections:
    if section not in graph["edges"]:
      graph["nodes"][section]["mass"] += 6 
  
  # Instead of this dump, I will keep the nodes order.
  output.write(json.dumps(graph, encoding="utf-8"))
    
  input.close()
  if output_file is not None:
    output.close()

if __name__ == "__main__":
  ''' Generates a json file for the arbor graph library from a simple
      text format.
  '''

  if len(sys.argv) < 2:
    usage()
    exit(2)                    # No options given

  main(sys.argv[1:])
